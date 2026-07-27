import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";
import type { ArticleBlock } from "@/app/lib/content";

/**
 * Renders ingested block content (headings, paragraphs, bullet lists, tables,
 * photos): a category's `intro`, a place's `body`, or an article's `body`.
 * Ported from the deleted `app/components/area/ArticleBody.tsx` (Task 11)
 * since city-category intros, places, and articles all need the same
 * renderer and area/ArticleBody.tsx's home route no longer exists.
 *
 * Each heading gets `id={`h-${i}`}` (its position in the `blocks` array) so
 * an "on this page" contents rail can link to `#h-{i}` for the same `i` it
 * finds by filtering `blocks` for `type === "h"` (see place/article page).
 */
const CELL_SEP = " · ";

/**
 * The corpus contains real tables ("Kayaking Areas by Difficulty" with
 * Area/Location/Best For/Difficulty columns), but the docx extraction
 * flattened each row into a paragraph with middot separators, so they
 * rendered as a wall of run-on lines. This stitches consecutive
 * separator-bearing paragraphs back into a table: the first row becomes the
 * header. Done at render time so it fixes every already-ingested guide
 * without a re-ingest.
 *
 * Deliberately conservative: needs at least 3 columns and 3 consecutive
 * rows with a consistent column count, so ordinary prose that happens to
 * contain a middot is never swallowed.
 */
function stitchTables(blocks: ArticleBlock[]): ArticleBlock[] {
  const cols = (b: ArticleBlock) =>
    b.type === "p" && b.text?.includes(CELL_SEP) ? b.text.split(CELL_SEP).map((c) => c.trim()) : null;

  const out: ArticleBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const first = cols(blocks[i]);
    if (!first || first.length < 3) {
      out.push(blocks[i]);
      continue;
    }
    const rows = [first];
    let j = i + 1;
    while (j < blocks.length) {
      const next = cols(blocks[j]);
      if (!next || next.length !== first.length) break;
      rows.push(next);
      j++;
    }
    if (rows.length >= 3) {
      out.push({ type: "table", rows });
      i = j - 1;
    } else {
      out.push(blocks[i]);
    }
  }
  return out;
}

/**
 * `lead` controls whether the first paragraph is promoted to `.ar-lead`.
 * `GuideBody` renders one call per section, so leaving it on would open all
 * 28 sections of a long guide at 20px and flatten the hierarchy against the
 * 28px section headings. It stays on by default for single-body callers
 * (places, articles), where one lead paragraph is right.
 */
/**
 * The same repair as `stitchTables`, for lists. The docx extraction flattened
 * bulleted lists into one paragraph per item, so "Orcas / Sea otters / Sea
 * lions / Harbor seals" arrived as ten separate paragraphs, each carrying a
 * full paragraph's leading. A run of short, unpunctuated paragraphs is a
 * list, and reads like one only when it is rendered as one.
 *
 * Conservative on purpose: at least three in a row, each short, none ending
 * in sentence punctuation, so ordinary prose is never swallowed.
 */
const LIST_ITEM_MAX_CHARS = 48;

function stitchLists(blocks: ArticleBlock[]): ArticleBlock[] {
  const item = (b: ArticleBlock) =>
    b.type === "p" && b.text && b.text.length <= LIST_ITEM_MAX_CHARS && !/[.?!:;,]$/.test(b.text.trim())
      ? b.text.trim()
      : null;

  const out: ArticleBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const first = item(blocks[i]);
    if (!first) {
      out.push(blocks[i]);
      continue;
    }
    const items = [first];
    let j = i + 1;
    while (j < blocks.length) {
      const next = item(blocks[j]);
      if (!next) break;
      items.push(next);
      j++;
    }
    if (items.length >= 3) {
      out.push({ type: "list", items });
      i = j - 1;
    } else {
      out.push(blocks[i]);
    }
  }
  return out;
}

export function ArticleBlocks({ blocks: raw, lead = true }: { blocks: ArticleBlock[]; lead?: boolean }) {
  const blocks = stitchLists(stitchTables(raw));
  // First "p" block gets the lead treatment. Computed up front rather than
  // via a mutable flag inside the render loop (that pattern was carried
  // over from the deleted ArticleBody.tsx and tripped the
  // no-reassignment-during-render lint rule).
  const firstParagraphIndex = lead ? blocks.findIndex((b) => b.type === "p") : -1;
  return (
    <div className="ar-body">
      {blocks.map((b, i) => {
        if (b.type === "h") return <h2 key={i} id={`h-${i}`} className="ar-h2">{b.text}</h2>;
        if (b.type === "p") {
          return <p key={i} className={i === firstParagraphIndex ? "ar-lead" : "ar-p"}>{b.text}</p>;
        }
        if (b.type === "list" && b.items?.length) {
          return (
            <ul key={i} className="ar-list">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
        }
        if (b.type === "table" && b.rows?.length) {
          const [head, ...body] = b.rows;
          return (
            <div key={i} className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>{head.map((c, j) => <th key={j}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((row, r) => (
                    <tr key={r}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.type === "img" && b.publicId) {
          return (
            <figure key={i} className="ar-fig">
              <Image src={cld(b.publicId, { w: 1400, fit: "limit" })} alt="" width={b.w ?? 1400} height={b.h ?? 900} sizes="(max-width: 900px) 100vw, 700px" />
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
