/**
 * Render-time repairs for ingested copy.
 *
 * The corpus is imported from .docx files that were written for a CMS, and a
 * few of them carry their SEO fields inline as the first paragraph. That
 * paragraph is the one promoted into the banner standfirst and into the guide
 * cards, so without this every other card on a destination page opens with the
 * words "Meta Description:". Fixed here rather than in the ingest so it holds
 * for the documents already in the database.
 */
const FIELD_LABEL = /^\s*(meta\s*description|meta\s*title|seo\s*title|seo\s*description|description)\s*[::-]\s*/i;

export function cleanText(text: string | undefined): string | undefined {
  if (!text) return text;
  const out = text.replace(FIELD_LABEL, "").trim();
  return out.length > 0 ? out : undefined;
}

/** Shortens to `max` characters on a word boundary, with a trailing ellipsis. */
export function trimText(text: string | undefined, max: number): string {
  const clean = cleanText(text) ?? "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/[\s,.;:]+$/, "")}...`;
}
