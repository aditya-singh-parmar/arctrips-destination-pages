/**
 * Pure docx-block to tree classifier.
 *
 * A corpus category doc (e.g. `Tofino - Beaches.docx`) is not an article, it
 * is a category page: H1 is the category, H2s are its sections, and each H3
 * under a "listing" H2 is a place with its own copy, "good for" list, and
 * "Good to know" note. `scripts/ingest-articles.mjs` extracts the ordered
 * blocks; this module turns them into { intro, places, faqs, images }.
 *
 * Spec: docs/superpowers/specs/2026-07-24-destination-pages-v1.1-design.md section 7.
 *
 * `blocks` shape (already produced by the ingest driver's docx extraction):
 *   { style: "Heading1"|"Heading2"|"Heading3"|"Body", text: string,
 *     imageRef?: string, table?: boolean, tableHeader?: boolean }[]
 *
 * `opts.placeHeadings`: an explicit per-doc whitelist of H2 texts whose H3
 * children become places. Any H2 not on the list contributes to the category
 * intro instead — this whitelist is what keeps FAQ questions (and any other
 * non-listing H2 section) out of the places table. An H2 matching
 * "Frequently Asked Questions" always switches to FAQ mode regardless of the
 * whitelist.
 *
 * `opts.placeLevel`: "h3" (default) or "h2". Some docs list each place as a
 * numbered H2 ("1. Mount Douglas Park") with no listing wrapper at all. In
 * "h2" mode a numbered H2 is itself a place, and the whitelist is unused.
 *
 * Formatting debris (blank spacer headings, bare iStock URLs, flattened table
 * headers, sentences styled as headings) is removed here rather than in the
 * rows, so a re-ingest cannot reintroduce it. See ./clean.mjs.
 */
import {
  splitUrls, pickSourceUrl, isSpacerHeading, isSentenceHeading,
  stripListNumber, isNumberedHeading, cleanGoodFor,
} from "./clean.mjs";

const FAQ_HEADING_RE = /frequently asked questions|^faqs?$/i;
const GOOD_TO_KNOW_RE = /^good to know:?\s*/i;
const GOOD_FOR_LIST_MAX_LEN = 60;

/** lowercase, strip apostrophes entirely, collapse any run of non-alphanumerics to one hyphen, trim hyphens. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Hard rule: no em dashes in rendered copy (CLAUDE.md). The corpus contains
 * them, so strip at ingest rather than in the rows, otherwise a re-ingest
 * reintroduces them. Number ranges become "to", everything else a comma.
 * Plain hyphens are left alone.
 */
export function normalizeCopy(text) {
  if (text == null) return text;
  return String(text)
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}

function newPlace(name) {
  return { name, slug: slugify(name), body: [], goodFor: [], goodToKnow: undefined, collectingGoodFor: false };
}

/**
 * Feeds one non-image Body paragraph into a place under construction.
 * Handles the "Good to know:" note and the "...for:" bullet list, in that
 * priority order, so a Good to know line always terminates an open list.
 */
function addBodyLine(place, text) {
  if (GOOD_TO_KNOW_RE.test(text)) {
    place.goodToKnow = text.replace(GOOD_TO_KNOW_RE, "").trim();
    place.collectingGoodFor = false;
    return;
  }
  if (place.collectingGoodFor) {
    if (text.length > GOOD_FOR_LIST_MAX_LEN) {
      // A long paragraph ends the list; it reads as body copy, not a bullet.
      place.collectingGoodFor = false;
      place.body.push({ type: "p", text });
    } else {
      place.goodFor.push(text);
    }
    return;
  }
  if (text.trim().endsWith(":")) {
    // The trigger label itself ("... is a good place for:") is not body copy.
    place.collectingGoodFor = true;
    return;
  }
  place.body.push({ type: "p", text });
}

export function classify(rawBlocks, opts) {
  const placeLevel = opts?.placeLevel === "h2" ? "h2" : "h3";
  const placeHeadings = new Set(opts?.placeHeadings ?? []);
  // Whitelist entries were read off the raw docs, so match the raw text as
  // well as the em-dash-normalised text: either spelling counts.
  const inWhitelist = (raw, norm) => placeHeadings.has(raw) || placeHeadings.has(norm);

  /* Pre-pass: strip URLs and em dashes once, at the door, so every downstream
     branch sees clean copy and every URL is available as an attribution. */
  const blocks = (rawBlocks ?? [])
    .filter((b) => !b.tableHeader) // flattened table headers are labels, not copy
    .map((b) => {
      const { text: withoutUrls, urls } = splitUrls(b.text);
      return { ...b, raw: String(b.text ?? "").trim(), text: normalizeCopy(withoutUrls) ?? "", urls };
    });

  // In "h2" place mode, only numbered H2s are entries when the doc numbers any
  // of them; a doc that numbers none treats every non-FAQ H2 as an entry.
  const docNumbersH2 = placeLevel === "h2"
    && blocks.some((b) => b.style === "Heading2" && isNumberedHeading(b.text));

  const intro = [];
  const places = [];
  const faqs = [];
  const images = [];
  const seenPlaceSlugs = new Set();

  /** @type {"intro"|"place-listing"|"faq"} */
  let mode = "intro";
  let currentPlace = null;
  let currentFaq = null;
  /* Image attribution.
     In the real corpus an embed and its iStock URL are separate, adjacent
     blocks, and the URL comes BEFORE its image far more often than after
     (1,432 times against 327 across the 73 documents). Both directions are
     therefore matched, oldest-first, through two queues: URLs still looking
     for an image, and images still looking for a URL. Only one queue is ever
     non-empty. */
  const pendingUrls = [];
  const pendingImages = [];

  const resetSectionState = () => {
    currentPlace = null;
    currentFaq = null;
    // Never carry an attribution across a section boundary.
    pendingUrls.length = 0;
    pendingImages.length = 0;
  };

  const startPlace = (name) => {
    const place = newPlace(stripListNumber(name));
    if (!place.slug || seenPlaceSlugs.has(place.slug)) {
      // A duplicate heading would collide on the (city, category, slug) unique
      // index. Keep the first and let the rest flow into it as body copy.
      return currentPlace;
    }
    seenPlaceSlugs.add(place.slug);
    places.push(place);
    return place;
  };

  for (const block of blocks) {
    const text = block.text ?? "";
    const isHeading = block.style === "Heading1" || block.style === "Heading2" || block.style === "Heading3";
    // A heading with no text is a layout artefact around an embedded image: it
    // must not close the section it sits in. A heading that is a whole
    // sentence is body copy that was styled wrongly.
    const spacer = isHeading && isSpacerHeading(text);
    const demoted = isHeading && !spacer && isSentenceHeading(text);
    const style = spacer || demoted ? "Body" : block.style;

    if (style === "Heading1") {
      mode = "intro";
      resetSectionState();
      if (text) intro.push({ type: "h", text });
    } else if (style === "Heading2") {
      resetSectionState();
      if (FAQ_HEADING_RE.test(text)) {
        mode = "faq";
      } else if (placeLevel === "h2" && (!docNumbersH2 || isNumberedHeading(text))) {
        mode = "place-listing";
        currentPlace = startPlace(text);
      } else if (inWhitelist(block.raw, text)) {
        mode = "place-listing";
      } else {
        mode = "intro";
        if (text) intro.push({ type: "h", text });
      }
    } else if (style === "Heading3") {
      if (mode === "place-listing" && placeLevel === "h3") {
        currentPlace = startPlace(text);
        pendingUrls.length = 0;
        pendingImages.length = 0;
      } else if (mode === "faq") {
        currentFaq = { q: text, aParts: [] };
        faqs.push(currentFaq);
      } else if (mode === "place-listing" && currentPlace) {
        currentPlace.body.push({ type: "h", text });
      } else {
        intro.push({ type: "h", text });
      }
    } else if (text && !block.imageRef) {
      // Plain body copy. A block that held nothing but a URL has empty text
      // by now and is handled purely as attribution below.
      if (mode === "place-listing" && currentPlace) {
        addBodyLine(currentPlace, text);
      } else if (mode === "faq" && currentFaq) {
        currentFaq.aParts.push(text);
      } else {
        // A row flattened out of a reference table is marked, so it can be
        // kept in the body but never picked as a lead paragraph.
        intro.push(block.table ? { type: "p", text, table: true } : { type: "p", text });
      }
    }

    /* Images and their attribution, for every block regardless of style: in
       the corpus an embed frequently rides on a heading paragraph, and its
       iStock URL arrives on the paragraph before it, the same paragraph, or
       the one after. */
    const ownSourceUrl = pickSourceUrl(block.urls);

    let carriedUrl = ownSourceUrl;

    if (block.imageRef) {
      const placeSlug = mode === "place-listing" && currentPlace ? currentPlace.slug : undefined;
      // An attribution already waiting is this image's: the URL leads. Failing
      // that, a URL on the image's own block is its own.
      let sourceUrl = pendingUrls.shift();
      if (!sourceUrl && carriedUrl) { sourceUrl = carriedUrl; carriedUrl = undefined; }
      const img = { ref: block.imageRef, placeSlug, sourceUrl };
      images.push(img);
      if (!sourceUrl) pendingImages.push(img);
    }

    if (carriedUrl) {
      // An unclaimed URL either settles the oldest image still waiting, or
      // queues up for the next image to arrive.
      if (!block.imageRef && pendingImages.length) pendingImages.shift().sourceUrl = carriedUrl;
      else pendingUrls.push(carriedUrl);
    }
  }

  return {
    intro,
    places: places.map(({ collectingGoodFor: _collectingGoodFor, ...p }) => ({
      ...p,
      goodFor: cleanGoodFor(p.goodFor, GOOD_FOR_LIST_MAX_LEN),
    })),
    faqs: faqs.map((f) => ({ q: f.q, a: f.aParts.join(" ") })),
    images,
  };
}
