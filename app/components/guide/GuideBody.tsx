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
 *
 * Two things break the 68ch measure on purpose, because 9,000 words in one
 * unrelieved column is unreadable:
 *
 *   1. Every second photograph runs wide (`.ar-fig--wide`, up to 1080px).
 *   2. At most two short paragraphs are promoted to `.gb-callout`, set large
 *      and ruled top and bottom.
 *
 * The callout is a promotion, not a pull quote: the paragraph is moved up in
 * typographic weight in place, never duplicated. Nothing is invented and
 * nothing is repeated, which matters because this content is ingested and
 * cannot be hand-tuned per guide.
 */
const SECTIONS_PER_PHOTO = 2;
const MAX_CALLOUTS = 2;
/** Short enough to carry at 23px without turning into a wall. */
const CALLOUT_MAX_CHARS = 190;
const CALLOUT_MIN_CHARS = 60;

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

/**
 * A section needs this much prose before promoting one of its paragraphs. A
 * callout in a two-paragraph section does not read as a designed beat, it
 * reads as a paragraph that was accidentally set too large.
 */
const CALLOUT_MIN_BLOCKS = 6;

/**
 * Picks which paragraphs get promoted. The candidate must sit inside a
 * substantial run of prose: never the first or last two blocks of its
 * section, and never in a short section. Deterministic, so the same guide
 * always renders the same way.
 */
function pickCallouts(sections: Section[]): Set<string> {
  const picked = new Set<string>();
  let lastPicked = -99;
  for (let s = 2; s < sections.length && picked.size < MAX_CALLOUTS; s++) {
    // Never two in nearby sections: a promoted paragraph every few screens
    // is a beat, one every screen is noise.
    if (s - lastPicked < 4) continue;
    const paras = sections[s].blocks;
    if (paras.length < CALLOUT_MIN_BLOCKS) continue;
    const at = paras.findIndex(
      (b, i) =>
        i >= 2 &&
        i <= paras.length - 3 &&
        b.type === "p" &&
        !!b.text &&
        b.text.length >= CALLOUT_MIN_CHARS &&
        b.text.length <= CALLOUT_MAX_CHARS,
    );
    if (at === -1) continue;
    picked.add(`${s}:${at}`);
    lastPicked = s;
  }
  return picked;
}

export function GuideBody({ blocks, photos }: { blocks: ArticleBlock[]; photos: Photo[] }) {
  const sections = splitSections(blocks);
  const callouts = pickCallouts(sections);
  let photoCursor = 0;

  return (
    <>
      {sections.map((s, n) => {
        // A photo after every couple of sections, never before the first one.
        const wantsPhoto = n > 0 && n % SECTIONS_PER_PHOTO === 0 && photoCursor < photos.length;
        const photoIndex = wantsPhoto ? photoCursor++ : -1;
        const photo = photoIndex === -1 ? undefined : photos[photoIndex];
        const calloutAt = [...callouts].find((k) => k.startsWith(`${n}:`));
        const calloutIndex = calloutAt ? Number(calloutAt.split(":")[1]) : -1;

        return (
          <div key={n}>
            {photo && (
              <figure className={photoIndex % 2 === 1 ? "ar-fig ar-fig--wide" : "ar-fig"}>
                <Image
                  src={cld(photo.publicId, { w: 1400, h: 800, fit: "fill" })}
                  alt={photo.caption ?? ""}
                  width={1400}
                  height={800}
                  sizes="(max-width: 900px) 100vw, 1080px"
                />
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            )}
            {s.heading && <h2 id={`s-${s.index}`} className="ar-h2">{s.heading.text}</h2>}
            {calloutIndex === -1 ? (
              <ArticleBlocks blocks={s.blocks} lead={n === 0} />
            ) : (
              <>
                <ArticleBlocks blocks={s.blocks.slice(0, calloutIndex)} lead={n === 0} />
                <p className="gb-callout">{s.blocks[calloutIndex].text}</p>
                <ArticleBlocks blocks={s.blocks.slice(calloutIndex + 1)} lead={false} />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
