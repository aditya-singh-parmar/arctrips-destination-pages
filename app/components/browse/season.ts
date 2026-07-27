/**
 * The three-tier season model. Never two tiers.
 *
 * The coast is open all year. The quiet months are cheaper and emptier, which
 * for a lot of people is the reason to go, so a month that is not peak must
 * not render as a dead cell. The scale reads peak / good / quieter, and
 * quieter carries its own colour.
 *
 * `peak` is the editor's best_months for the category. `good` is the month on
 * either side of any peak month, wrapping the year end so a November to
 * February run picks up October and March. Everything else is `quiet`. A
 * category with no best_months at all is `good` in every month rather than
 * quiet in every month: no data is not the same as a bad time to go.
 *
 * Pure, so it can be shared by the strip, the almanac, the cards and the
 * ordering without any of them disagreeing about what December means.
 */
export type SeasonTier = "peak" | "good" | "quiet";

export const MONTH_LETTER = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Twelve tiers, index 0 is January. */
export function seasonTiers(months: number[]): SeasonTier[] {
  const peak = new Set(months);
  if (peak.size === 0) return Array<SeasonTier>(12).fill("good");

  const good = new Set<number>();
  for (const m of peak) {
    good.add(m === 1 ? 12 : m - 1);
    good.add(m === 12 ? 1 : m + 1);
  }
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return peak.has(m) ? "peak" : good.has(m) ? "good" : "quiet";
  });
}

/** The tier for one month, 1 to 12. */
export function tierForMonth(months: number[], month: number): SeasonTier {
  return seasonTiers(months)[month - 1];
}

/** Never colour alone: every tier carries its own words. */
export const TIER_WORD: Record<SeasonTier, string> = {
  peak: "At its best now",
  good: "Good now",
  quiet: "Quieter now",
};

/** The legend, in the owner's wording. "Quieter" is a reason to go, not a warning. */
export const TIER_LEGEND: { tier: SeasonTier; label: string }[] = [
  { tier: "peak", label: "At its best" },
  { tier: "good", label: "Good" },
  { tier: "quiet", label: "Quieter, fewer people" },
];

/** Peak first, then good, then quiet. What orders every guide list on the site. */
export const TIER_RANK: Record<SeasonTier, number> = { peak: 0, good: 1, quiet: 2 };

export function rankForMonth(months: number[], month: number): number {
  return TIER_RANK[tierForMonth(months, month)];
}
