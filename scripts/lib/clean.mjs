/**
 * Pure text-cleanup helpers for corpus ingestion.
 *
 * The `.docx` corpus carries four kinds of formatting debris that reach the
 * rendered page if nothing removes them at ingest:
 *
 *  1. Blank headings used as image spacers (79 across the corpus). Word gives
 *     the paragraph that holds an embedded image a Heading style with no text,
 *     so a naive reader both loses the image and closes the section it sat in.
 *  2. Bare iStock source URLs (1,785 standalone paragraphs, plus 29 glued
 *     directly onto the end of a heading, e.g. "3. Rochford Squarehttps://...").
 *     These are attribution, not copy: they belong in `photos.source_url`.
 *  3. Table header rows ("Beach · Location · Best For"), which read as a
 *     "good for" bullet once a table is flattened to paragraphs.
 *  4. Full sentences styled as headings (34 of them), which produce a place
 *     page titled with a whole sentence.
 *
 * Everything here is pure and unit-tested in ./clean.test.mjs.
 */

/** Matches a run of URL characters. Trailing sentence punctuation is excluded. */
/**
 * Word splits a hyperlink across text runs, so a URL can reach us with its
 * leading characters shorn off: the corpus contains paragraphs that begin
 * "ttps://www.istockphoto.com/...". Matching only https?:// let those through
 * and they rendered as body copy. This accepts a truncated scheme and a bare
 * www host as well.
 */
const URL_RE = /(?:h?t?t?ps?:\/\/|www\.)[^\s)]+/gi;
/** A trailing "1. " / "12) " list number, as used by the roundup and Agent Trek docs. */
const LIST_NUMBER_RE = /^\s*\d{1,3}\s*[.)]\s*/;
/** Longest a heading can be before it reads as a sentence rather than a title. */
export const MAX_HEADING_LENGTH = 90;

/**
 * Pulls every URL out of a text run.
 * Returns the remaining copy (whitespace collapsed) and the URLs in order, so
 * the caller can route the URLs to `photos.source_url` and keep, or drop, the
 * remainder on its own merits.
 */
export function splitUrls(text) {
  const raw = String(text ?? "");
  const urls = raw.match(URL_RE) ?? [];
  if (!urls.length) return { text: raw.trim(), urls: [] };
  return { text: raw.replace(URL_RE, " ").replace(/\s+/g, " ").trim(), urls };
}

/** The first iStock URL in a list, or the first URL of any kind, or undefined. */
export function pickSourceUrl(urls) {
  if (!urls?.length) return undefined;
  return urls.find((u) => /istockphoto\.com/i.test(u)) ?? urls[0];
}

/**
 * True when a heading carries no title: empty, or only punctuation and a list
 * number left over once its URL has been stripped. Such a heading must not
 * close the section it appears in; it is a layout artefact, not structure.
 */
export function isSpacerHeading(text) {
  const stripped = stripListNumber(String(text ?? "")).replace(/[\s.,:;–-]+/g, "");
  return stripped.length === 0;
}

/**
 * True when a "heading" is really a sentence of body copy. Questions are
 * exempt: an FAQ question is a legitimate long heading.
 */
export function isSentenceHeading(text) {
  const t = String(text ?? "").trim();
  return t.length > MAX_HEADING_LENGTH && !t.endsWith("?");
}

/** "3. Rochford Square" -> "Rochford Square". Leaves unnumbered text alone. */
export function stripListNumber(text) {
  return String(text ?? "").replace(LIST_NUMBER_RE, "").trim();
}

/** True when a heading is numbered, which is how the roundup docs mark an entry. */
export function isNumberedHeading(text) {
  return LIST_NUMBER_RE.test(String(text ?? ""));
}

/**
 * Column labels seen in the corpus' reference tables. Matched whole, never as
 * a substring, so a real bullet ("Families with young kids") is never dropped.
 */
const HEADER_WORDS = new Set([
  "beach", "beaches", "trail", "trails", "place", "places", "spot", "spots",
  "name", "location", "locations", "area", "areas", "region", "town",
  "best for", "good for", "why go", "why visit", "highlight", "highlights",
  "type", "distance", "length", "duration", "difficulty", "level", "rating",
  "access", "parking", "season", "when", "when to go", "time", "notes", "note",
  "price", "cost", "hours", "restaurant", "restaurants", "dish", "cuisine",
  "park", "parks", "activity", "activities", "feature", "features",
]);

/**
 * True when a line is a flattened table header rather than content. A header
 * is made only of column labels, whether it survived as the whole joined row
 * ("Beach · Location · Best For") or as one orphaned cell ("Location").
 */
export function isTableFragment(text) {
  const parts = String(text ?? "")
    .split(/\s*[·|,]\s*|\s+[-–]\s+/)
    .map((s) => s.trim().toLowerCase().replace(/[:.]+$/, ""))
    .filter(Boolean);
  if (!parts.length) return true;
  return parts.every((p) => HEADER_WORDS.has(p));
}

/**
 * Filters a place's "good for" bullets: drops table-header debris, empties and
 * duplicates, and anything long enough to be a paragraph.
 */
export function cleanGoodFor(items, maxLength = 60) {
  const seen = new Set();
  const out = [];
  for (const item of items ?? []) {
    const t = String(item ?? "").trim().replace(/^[•\-–]\s*/, "");
    if (!t || t.length > maxLength) continue;
    // A middot-joined line is a flattened table row, never a bullet.
    if (t.includes(" · ")) continue;
    if (isTableFragment(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Case- and whitespace-insensitive equality, used to spot a body paragraph that repeats the blurb. */
export function sameText(a, b) {
  const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
  return norm(a) === norm(b);
}

/**
 * True when `text` says what `lead` already said: identical, or one is the
 * opening of the other. A hub's meta description is usually the first
 * sentences of its opening paragraph, so printing both puts the same words on
 * screen twice.
 */
export function isRestatementOf(text, lead) {
  if (!text || !lead) return false;
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
  const [a, b] = [norm(text), norm(lead)];
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  // A short fragment matching the start of a long paragraph is coincidence,
  // not a restatement; require a real overlap.
  return shorter.length >= 60 && longer.startsWith(shorter);
}

/**
 * Splits a place's body into a blurb and the remaining blocks.
 *
 * The blurb is the opening paragraph, which is then removed from the body so
 * the page never prints the same sentence twice (the owner's standing
 * complaint). A very long opening paragraph is summarised to its first
 * sentences instead and left in place, because truncating it away would lose
 * copy.
 */
export function splitBlurb(body, maxBlurb = 320) {
  const blocks = body ?? [];
  const firstIndex = blocks.findIndex((b) => b.type === "p" && b.text?.trim());
  if (firstIndex === -1) return { blurb: "", body: blocks };
  const first = blocks[firstIndex].text.trim();

  if (first.length <= maxBlurb) {
    return { blurb: first, body: blocks.filter((_, i) => i !== firstIndex) };
  }

  // Too long to be a standfirst: take whole sentences up to the limit and keep
  // the paragraph itself, so nothing is lost.
  let blurb = "";
  for (const sentence of first.split(/(?<=[.!?])\s+/)) {
    if (blurb && (blurb + " " + sentence).length > maxBlurb) break;
    blurb = blurb ? `${blurb} ${sentence}` : sentence;
  }
  return { blurb: blurb.trim(), body: blocks };
}

/**
 * Editors typed the CMS fields into the top of the document, so a guide's
 * first paragraph reads "Meta Description:Discover the best hikes in
 * Squamish...". The PRD wants the meta description as a typed field, not as
 * body copy, so this both recognises the line and hands back its value.
 *
 * Returns { field, value } when the text is a CMS field line, else null.
 */
const CMS_FIELD = /^\s*(meta\s*description|meta\s*title|seo\s*title|title\s*tag|slug|url|keywords?|focus\s*keyword)\s*[:：]\s*(.*)$/is;

export function readCmsField(text) {
  const m = CMS_FIELD.exec(String(text || ""));
  if (!m) return null;
  const field = m[1].toLowerCase().replace(/\s+/g, "-");
  return { field, value: m[2].trim() };
}

/** True when a block is a CMS field line and must never render as copy. */
export function isCmsField(text) {
  return readCmsField(text) !== null;
}

/**
 * An editor's note to themselves, left in the copy: "(add Wickannish trail)".
 * The PRD blocks publish on these. Stripping the parenthetical keeps the
 * sentence, which is what the editor intended to ship.
 */
const EDITOR_NOTE = /\s*\(\s*(?:add|insert|rewrite|todo|tbd|fixme|source needed|check with)\b[^)]{0,140}\)/gi;

export function stripEditorNotes(text) {
  return String(text ?? "").replace(EDITOR_NOTE, "").replace(/\s+([,.;:])/g, "$1").replace(/\s{2,}/g, " ").trim();
}

export function hasEditorNote(text) {
  EDITOR_NOTE.lastIndex = 0;
  return EDITOR_NOTE.test(String(text ?? ""));
}
