import Image from "next/image";
import type { ArticleBlock, Photo } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";

/**
 * The corpus ingest put every photograph into the `photos` table and left the
 * guide bodies as pure text, so a 310 paragraph birding guide rendered with
 * no imagery at all. That, not the type scale, is why the guides read as
 * plain documents.
 *
 * This splits the body at its headings and drops a real photograph between
 * sections, so a long read has a visual beat roughly every screenful. Photos
 * are consumed in order and never repeated; if a guide has more sections than
 * photos the remaining sections simply run on, which is correct.
 */
const SECTIONS_PER_PHOTO = 2;

type Section = { heading?: ArticleBlock; blocks: ArticleBlock[]; index: number };

export function splitSections(blocks: ArticleBlock[]): Section[] {
  const out: Section[] = [];
  let current: Section = { blocks: [], index: 0 };
  blocks.forEach((b, i) => {
    if (b.type === "h") {
      if (current.blocks.length || current.heading) out.push(current);
      current = { heading: b, blocks: [], index: i };
    } else {
      current.blocks.push(b);
    }
  });
  if (current.blocks.length || current.heading) out.push(current);
  return out;
}

export function GuideBody({ blocks, photos }: { blocks: ArticleBlock[]; photos: Photo[] }) {
  const sections = splitSections(blocks);
  let photoCursor = 0;

  return (
    <>
      {sections.map((s, n) => {
        // A photo after every couple of sections, never before the first one.
        const wantsPhoto = n > 0 && n % SECTIONS_PER_PHOTO === 0 && photoCursor < photos.length;
        const photo = wantsPhoto ? photos[photoCursor++] : undefined;
        return (
          <div key={n}>
            {photo && (
              <figure className="ar-fig">
                <Image
                  src={cld(photo.publicId, { w: 1400, h: 800, fit: "fill" })}
                  alt={photo.caption ?? ""}
                  width={1400}
                  height={800}
                  sizes="(max-width: 900px) 100vw, 720px"
                />
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            )}
            {s.heading && <h2 id={`s-${s.index}`} className="ar-h2">{s.heading.text}</h2>}
            <ArticleBlocks blocks={s.blocks} />
          </div>
        );
      })}
    </>
  );
}
