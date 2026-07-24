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
 *   { style: "Heading1"|"Heading2"|"Heading3"|"Body", text: string, imageRef?: string }[]
 *
 * `opts.placeHeadings`: an explicit per-doc whitelist of H2 texts whose H3
 * children become places. Any H2 not on the list contributes to the category
 * intro instead — this whitelist is what keeps FAQ questions (and any other
 * non-listing H2 section) out of the places table. An H2 matching
 * "Frequently Asked Questions" always switches to FAQ mode regardless of the
 * whitelist.
 */

const FAQ_HEADING_RE = /frequently asked questions/i;
const ISTOCK_RE = /istockphoto\.com/i;
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

export function classify(blocks, opts) {
  const placeHeadings = new Set(opts?.placeHeadings ?? []);
  const intro = [];
  const places = [];
  const faqs = [];
  const images = [];

  /** @type {"intro"|"place-listing"|"faq"} */
  let mode = "intro";
  let currentPlace = null;
  let currentFaq = null;
  // The most recently pushed image still waiting for its adjacent iStock
  // source-url paragraph. In the real corpus the embed and its attribution
  // are separate, adjacent Body blocks; this closes that gap.
  let pendingImage = null;

  const resetSectionState = () => {
    currentPlace = null;
    currentFaq = null;
    pendingImage = null;
  };

  for (const block of blocks) {
    if (block.style === "Heading1") {
      mode = "intro";
      resetSectionState();
      if (block.text) intro.push({ type: "h", text: block.text });
      continue;
    }

    if (block.style === "Heading2") {
      resetSectionState();
      if (FAQ_HEADING_RE.test(block.text)) {
        mode = "faq";
      } else if (placeHeadings.has(block.text)) {
        mode = "place-listing";
      } else {
        mode = "intro";
        if (block.text) intro.push({ type: "h", text: block.text });
      }
      continue;
    }

    if (block.style === "Heading3") {
      if (mode === "place-listing") {
        currentPlace = newPlace(block.text);
        places.push(currentPlace);
        pendingImage = null;
      } else if (mode === "faq") {
        currentFaq = { q: block.text, aParts: [] };
        faqs.push(currentFaq);
      } else {
        intro.push({ type: "h", text: block.text });
      }
      continue;
    }

    // Body block.
    const text = block.text ?? "";
    const isIstockUrl = ISTOCK_RE.test(text);

    if (block.imageRef) {
      const placeSlug = mode === "place-listing" && currentPlace ? currentPlace.slug : undefined;
      const img = { ref: block.imageRef, placeSlug, sourceUrl: undefined };
      images.push(img);
      pendingImage = isIstockUrl ? null : img; // still needs its source url unless this same block carried it
      if (isIstockUrl) img.sourceUrl = text;
      continue; // the image's own paragraph is never body copy
    }

    if (isIstockUrl) {
      if (pendingImage) {
        pendingImage.sourceUrl = text;
        pendingImage = null;
      }
      continue; // source-attribution paragraph, never body copy
    }

    if (!text) continue;

    if (mode === "place-listing" && currentPlace) {
      addBodyLine(currentPlace, text);
    } else if (mode === "faq" && currentFaq) {
      currentFaq.aParts.push(text);
    } else {
      intro.push({ type: "p", text });
    }
  }

  return {
    intro,
    places: places.map(({ collectingGoodFor: _collectingGoodFor, ...p }) => p),
    faqs: faqs.map((f) => ({ q: f.q, a: f.aParts.join(" ") })),
    images,
  };
}
