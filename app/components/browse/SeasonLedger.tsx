import Link from "next/link";
import { MONTH_NAME } from "@/app/lib/taxonomy";
import { SeasonStrip, SeasonLegend } from "./SeasonStrip";
import { TIER_WORD, tierForMonth, type SeasonTier } from "./season";

export type LedgerEntry = {
  slug: string;
  name: string;
  href: string;
  /** best_months, 1 to 12. Empty is legal: the subject simply carries no peak. */
  months: number[];
  heroPublicId?: string;
  placeCount?: number;
  state: "live" | "sister" | "soon" | "open";
  priceFrom?: number;
  /** Where the subject is covered, e.g. "Tofino and Ucluelet". */
  where?: string;
  /** Optional group heading. Rows must arrive already grouped. */
  group?: string;
};

/**
 * The almanac: every subject measured against the same twelve months, so the
 * year reads as one table rather than as N unrelated strips scattered through
 * a card grid.
 *
 * This is the module that carries the product argument, that the site tells
 * you when to go before it sells anything. The right-hand column names what
 * this month is for each subject in words, so the table still answers the
 * question on a phone, where the twelve columns are hidden.
 */
export function SeasonLedger({
  entries,
  month,
  caption,
  legendNote = "Nothing here closes. The outline marks this month.",
}: {
  entries: LedgerEntry[];
  /** 1 to 12. The month to outline and to name in the last column. */
  month: number;
  /** Screen-reader table caption. */
  caption: string;
  legendNote?: string;
}) {
  if (entries.length === 0) return null;
  const heads = entries.map((e, i) => (e.group && e.group !== entries[i - 1]?.group ? e.group : undefined));

  return (
    <>
      <div className="ledwrap">
        <table className="led">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col" className="led__mon">Through the year</th>
              <th scope="col" style={{ textAlign: "right" }}>In {MONTH_NAME[month - 1]}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <Rows
                key={e.slug}
                entry={e}
                head={heads[i]}
                month={month}
                tier={tierForMonth(e.months, month)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <SeasonLegend note={legendNote} />
    </>
  );
}

function Rows({
  entry: e,
  head,
  month,
  tier,
}: {
  entry: LedgerEntry;
  head?: string;
  month: number;
  tier: SeasonTier;
}) {
  const note = [e.where, e.placeCount ? `${e.placeCount} documented` : undefined]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <>
      {head && (
        <tr className="led__group">
          <th scope="colgroup" colSpan={3}>{head}</th>
        </tr>
      )}
      <tr>
        <td>
          <div className="led__s"><Link href={e.href}>{e.name}</Link></div>
          {note && <div className="led__w">{note}</div>}
        </td>
        <td className="led__mon">
          <SeasonStrip months={e.months} label={e.name} month={month} />
        </td>
        <td className="led__b">
          <span className={`tier tier--${tier}`}>{TIER_WORD[tier]}</span>
        </td>
      </tr>
    </>
  );
}
