/**
 * Slug generation for the geographic tree. Slugs are lowercase ASCII,
 * hyphen-separated, derived from the display name. The display name always
 * keeps its correct orthography; the slug is never the display name.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.6.
 */

/** Reserved at the area position of a /destinations URL. An area may never use one. */
export const RESERVED_DESTINATION_SLUGS = ["things-to-do", "plan", "compare"] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_DESTINATION_SLUGS as readonly string[]).includes(slug);
}

/**
 * Characters NFD does not decompose, chiefly the Nuu-chah-nulth orthography
 * already in scope (ʔapsčiik t̓ašii, Yuułuʔiłʔatḥ). Glottal stops and ejective
 * marks have no ASCII equivalent and are dropped; barred l and similar forms
 * map to their nearest letter.
 */
const EXTRA: Record<string, string> = {
  "ʔ": "", // ʔ latin letter glottal stop
  "ʕ": "", // ʕ pharyngeal voiced fricative
  "ʼ": "", // ʼ modifier letter apostrophe
  "ʻ": "", // ʻ modifier letter turned comma
  "’": "", // ’ right single quotation mark
  "ł": "l", // ł
  "ƛ": "tl", // ƛ
  "ʷ": "w", // ʷ
  "đ": "d", // đ
  "ø": "o", // ø
  "æ": "ae", // æ
  "œ": "oe", // œ
  "ß": "ss", // ß
  "þ": "th", // þ
  "ð": "d", // ð
};

export function toAsciiSlug(name: string): string {
  const folded = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop combining diacritics
    .split("")
    .map((ch) => (ch in EXTRA ? EXTRA[ch] : ch))
    .join("")
    .toLowerCase();

  const slug = folded
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "place";
}
