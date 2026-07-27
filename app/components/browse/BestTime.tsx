import { MONTH_SHORT, MONTH_NAME } from "@/app/lib/taxonomy";

/**
 * "Best time to go", rendered from best_months as a month-by-month indicator
 * rather than prose (PRD 6.4). The PRD calls this the single highest-value
 * module on a category page for organic search.
 *
 * AC 49: it must be legible without colour and announced correctly by a
 * screen reader. Each cell therefore carries a visible glyph as well as a
 * fill, and the whole strip is a real table with a caption, so a screen
 * reader reads "March: good" rather than a wall of letters.
 */
export function BestTime({ months, label }: { months: number[]; label: string }) {
  if (!months.length) return null;
  const inSeason = new Set(months);

  return (
    <figure className="besttime">
      <figcaption className="besttime__cap">Best time for {label}</figcaption>
      <table className="besttime__grid">
        <caption className="sr-only">
          Months that suit {label}: {months.map((m) => MONTH_NAME[m - 1]).join(", ")}.
        </caption>
        <tbody>
          <tr>
            {MONTH_SHORT.map((short, i) => {
              const good = inSeason.has(i + 1);
              return (
                <td key={i} className="besttime__cell" data-good={good}>
                  <span aria-hidden="true" className="besttime__m">{short}</span>
                  <span aria-hidden="true" className="besttime__dot">{good ? "●" : "○"}</span>
                  <span className="sr-only">{MONTH_NAME[i]}: {good ? "good" : "off season"}</span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <p className="besttime__legend">
        <span aria-hidden="true">{"●"}</span> in season
        <span className="besttime__sep" aria-hidden="true"> </span>
        <span aria-hidden="true">{"○"}</span> quieter
      </p>
    </figure>
  );
}

/** Compact form for a card: names the season rather than drawing the grid. */
export function seasonLabel(months: number[]): string | undefined {
  if (!months.length || months.length === 12) return undefined;
  const sorted = [...months].sort((a, b) => a - b);
  // A run that wraps the year end (storm watching, Nov to Feb) reads better
  // from its own start than from January.
  const wraps = sorted.includes(1) && sorted.includes(12);
  const ordered = wraps ? [...months] : sorted;
  const first = MONTH_NAME[ordered[0] - 1].slice(0, 3);
  const last = MONTH_NAME[ordered[ordered.length - 1] - 1].slice(0, 3);
  return `${first} to ${last}`;
}
