import Link from "next/link";
import Image from "next/image";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { MONTH_SHORT, MONTH_NAME } from "@/app/lib/taxonomy";
import { seasonLabel } from "@/app/components/browse/BestTime";

export type LedgerEntry = {
  slug: string;
  name: string;
  href: string;
  /** best_months, 1 to 12. Empty is legal: the row simply carries no season. */
  months: number[];
  heroPublicId?: string;
  placeCount?: number;
  state: "live" | "sister" | "soon" | "open";
  priceFrom?: number;
  /** Optional group heading, e.g. a taxonomy theme. Rows must arrive grouped. */
  group?: string;
};

/**
 * The almanac. Every guide in a destination measured against the same twelve
 * month columns, so the year reads as one table rather than as N unrelated
 * season strips scattered through a card grid.
 *
 * This is the module that carries DESIGN.md's one-thing-to-remember: the site
 * tells you when to go, in data, before it sells anything. It is deliberately
 * a real <table>: months are a genuine second axis, the column headers align
 * by construction at every row count, and it scales from 4 guides to 22
 * without any hand tuning.
 *
 * Accessibility: the month cells are decorative duplicates of a single
 * per-row text summary, so a screen reader hears "Beaches, in season May to
 * September" once rather than twelve cell announcements per row. That same
 * cell becomes the visible season column below 900px, where twelve columns no
 * longer fit. Nothing is available to one audience and not the other.
 */
export function SeasonLedger({
  entries,
  month,
  caption,
}: {
  entries: LedgerEntry[];
  /** 1 to 12. The column to mark as "now". */
  month: number;
  /** Screen-reader table caption. */
  caption: string;
}) {
  if (entries.length === 0) return null;
  // Group headings are resolved up front rather than with a cursor inside the
  // render loop: reassigning during render is a lint error and, more to the
  // point, makes the output depend on iteration order.
  const heads = entries.map((e, i) => (e.group && e.group !== entries[i - 1]?.group ? e.group : undefined));

  return (
    <div className="ledgerwrap">
      <table className="ledger">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="ledger__name">Guide</th>
            {MONTH_SHORT.map((short, i) => (
              <th key={i} scope="col" className="mo" data-now={i + 1 === month}>
                <span aria-hidden="true">{short}</span>
                <span className="sr-only">{MONTH_NAME[i]}</span>
              </th>
            ))}
            <th scope="col" className="ledger__seasontext">Season</th>
            <th scope="col" className="ledger__places">Places</th>
            <th scope="col" className="ledger__last">To book</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <Rows
              key={e.slug}
              entry={e}
              head={heads[i]}
              inSeason={new Set(e.months)}
              season={seasonLabel(e.months)}
              month={month}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Rows({
  entry: e,
  head,
  inSeason,
  season,
  month,
}: {
  entry: LedgerEntry;
  head?: string;
  inSeason: Set<number>;
  season?: string;
  month: number;
}) {
  return (
    <>
      {head && (
        <tr className="ledger__group">
          <th scope="colgroup" colSpan={16}>{head}</th>
        </tr>
      )}
      <tr>
        <th scope="row" className="ledger__name">
          <Link className="ledger__link" href={e.href}>
            <span className="ledger__thumb">
              <Image
                src={e.heroPublicId ? cld(e.heroPublicId, { w: 248, h: 184, fit: "fill" }) : placeholder(248, 184)}
                alt=""
                width={124}
                height={92}
                sizes="62px"
              />
            </span>
            <span>
              <span className="ledger__t">{e.name}</span>
              <span className="ledger__c">{stateNote(e)}</span>
            </span>
          </Link>
        </th>
        {MONTH_SHORT.map((_, i) => {
          const good = inSeason.has(i + 1);
          return (
            <td key={i} className="mo" data-good={good} data-now={i + 1 === month} aria-hidden="true">
              <span>{good ? "●" : "○"}</span>
            </td>
          );
        })}
        <td className="ledger__seasontext">{season ?? "All year"}</td>
        <td className="ledger__places">{e.placeCount ? e.placeCount : ""}</td>
        <td className="ledger__state" data-state={e.state}>{stateLabel(e)}</td>
      </tr>
    </>
  );
}

/** Never colour alone: the state column always carries its own words. */
function stateLabel(e: LedgerEntry): string {
  if (e.state === "soon") return "Coming soon";
  if (e.state === "sister") return "Arc Trips Fishing";
  if (e.state === "live") return e.priceFrom !== undefined ? `from $${e.priceFrom}` : "Book now";
  return "Free to visit";
}

function stateNote(e: LedgerEntry): string {
  const season = seasonLabel(e.months);
  if (e.placeCount && season) return `${e.placeCount} places, best ${season}`;
  if (e.placeCount) return `${e.placeCount} places`;
  if (season) return `Best ${season}`;
  return "Good all year";
}
