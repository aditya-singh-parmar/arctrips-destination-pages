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
export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  // First "p" block gets the lead treatment. Computed up front rather than
  // via a mutable flag inside the render loop (that pattern was carried
  // over from the deleted ArticleBody.tsx and tripped the
  // no-reassignment-during-render lint rule).
  const firstParagraphIndex = blocks.findIndex((b) => b.type === "p");
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
