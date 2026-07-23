import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";
import type { ArticleBlock } from "@/app/lib/content";

/** Renders ingested article blocks (headings, paragraphs, bullet lists, tables, photos)
    with editorial styling. The first paragraph is treated as a lead. */
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  let leadUsed = false;
  return (
    <div className="ar-body">
      {blocks.map((b, i) => {
        if (b.type === "h") return <h2 key={i} className="ar-h2">{b.text}</h2>;
        if (b.type === "p") {
          const lead = !leadUsed;
          leadUsed = true;
          return <p key={i} className={lead ? "ar-lead" : "ar-p"}>{b.text}</p>;
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
