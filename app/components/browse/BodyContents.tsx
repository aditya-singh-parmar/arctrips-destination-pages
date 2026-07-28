import type { ArticleBlock } from "@/app/lib/content";
import { splitSections } from "@/app/components/guide/GuideBody";
import { cleanText } from "@/app/components/browse/text";

/** Below this many sections a body reads fine without a contents list. */
const MIN_SECTIONS = 6;

/**
 * Inline contents for a long document body. PRD 8.5 requires a table of
 * contents auto-generated from the headings once a body passes a threshold,
 * and the hub documents are 14,000 words: without one there is no way into
 * the page.
 *
 * Deliberately inline and collapsible rather than a sticky rail. A rail was
 * built and rejected by the owner, and that decision stands.
 */
export function BodyContents({ blocks }: { blocks: ArticleBlock[] }) {
  const sections = splitSections(blocks)
    .filter((s) => s.heading?.text)
    .map((s) => ({ index: s.index, text: cleanText(s.heading!.text as string) }))
    .filter((s) => s.text);
  if (sections.length < MIN_SECTIONS) return null;

  return (
    <details className="dx-toc" open>
      <summary>
        <span>In this guide</span>
        <b className="tnum">{sections.length} sections</b>
      </summary>
      <ol>
        {sections.map((s) => (
          <li key={s.index}><a href={`#s-${s.index}`}>{s.text}</a></li>
        ))}
      </ol>
    </details>
  );
}
