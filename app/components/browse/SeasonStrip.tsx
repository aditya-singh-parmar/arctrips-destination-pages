import { MONTH_NAME } from "@/app/lib/taxonomy";
import { MONTH_LETTER, TIER_LEGEND, seasonTiers, type SeasonTier } from "./season";

/**
 * Twelve cells, one per month, on the three-tier scale.
 *
 * Legible without colour: every cell carries its month letter, the current
 * month is outlined rather than tinted, and the whole strip is announced as
 * one sentence rather than twelve unrelated cell reads.
 */
export function SeasonStrip({
  months,
  label,
  month,
  compact = false,
}: {
  months: number[];
  /** What the strip is about, for the screen reader sentence. */
  label: string;
  /** 1 to 12. The month to outline. */
  month: number;
  compact?: boolean;
}) {
  const tiers = seasonTiers(months);
  const spoken = MONTH_NAME.map((n, i) => `${n} ${WORD[tiers[i]]}`).join(", ");

  return (
    <div className={compact ? "mon mon--sm" : "mon"} role="img" aria-label={`${label}: ${spoken}.`}>
      {tiers.map((t, i) => (
        <i key={i} data-t={t} {...(i + 1 === month ? { "data-now": "" } : {})}>
          {MONTH_LETTER[i]}
        </i>
      ))}
    </div>
  );
}

const WORD: Record<SeasonTier, string> = {
  peak: "at its best",
  good: "good",
  quiet: "quieter",
};

/** The key beneath a strip or an almanac. Always names all three tiers. */
export function SeasonLegend({ note }: { note?: string }) {
  return (
    <p className="legend">
      {TIER_LEGEND.map(({ tier, label }) => (
        <span key={tier}>
          <span className={`sw sw--${tier}`} aria-hidden="true" />
          {label}
        </span>
      ))}
      {note && <span className="legend__note">{note}</span>}
    </p>
  );
}
