import { describe, it, expect } from "vitest";
import { CATEGORY_BEST_MONTHS, seasonalRank } from "./taxonomy";

describe("seasonalRank", () => {
  const storm = CATEGORY_BEST_MONTHS["storm-watching"];
  const whale = CATEGORY_BEST_MONTHS["whale-watching"];

  it("ranks storm watching above whale watching in December (AC 48)", () => {
    expect(seasonalRank(storm, 12)).toBeLessThan(seasonalRank(whale, 12));
  });

  it("ranks storm watching below whale watching in April (AC 48)", () => {
    expect(seasonalRank(storm, 4)).toBeGreaterThan(seasonalRank(whale, 4));
  });

  it("puts in-season categories ahead of out-of-season ones", () => {
    expect(seasonalRank([6, 7, 8], 7)).toBeLessThan(0);
    expect(seasonalRank([6, 7, 8], 1)).toBeGreaterThan(0);
  });

  it("treats an all-year category as always in season", () => {
    const allYear = CATEGORY_BEST_MONTHS.restaurants;
    for (const m of [1, 5, 9, 12]) expect(seasonalRank(allYear, m)).toBeLessThan(0);
  });

  it("is neutral when no months are set", () => {
    expect(seasonalRank([], 6)).toBe(1);
  });
});
