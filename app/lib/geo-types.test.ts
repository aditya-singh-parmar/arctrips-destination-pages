import { describe, it, expect } from "vitest";
import { isLegalChildType, geoPath, guidePath, isRenderable, countBodyWords, isThinBody, THIN_BODY_WORDS, type GeoNode } from "./geo-types";

function node(slug: string, type: GeoNode["type"]): GeoNode {
  return {
    id: slug, slug, name: slug, type, parentId: null, status: "published",
    body: [], alsoAppearsIn: [], facts: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z",
  };
}

describe("isLegalChildType", () => {
  it("allows the canonical chain", () => {
    expect(isLegalChildType(null, "province")).toBe(true);
    expect(isLegalChildType("province", "town")).toBe(true);
    expect(isLegalChildType("province", "region")).toBe(true);
    expect(isLegalChildType("region", "town")).toBe(true);
    expect(isLegalChildType("town", "area")).toBe(true);
  });

  it("rejects skipped and inverted tiers", () => {
    expect(isLegalChildType(null, "town")).toBe(false);
    expect(isLegalChildType(null, "region")).toBe(false);
    expect(isLegalChildType("region", "region")).toBe(false);
    expect(isLegalChildType("area", "area")).toBe(false);
    expect(isLegalChildType("town", "town")).toBe(false);
  });

  // Canada left the tree on 2026-07-30, see docs/qa/bc-root-contract.md. A
  // historical country row cannot be walked into or out of.
  it("keeps a country node out of the tree in both directions", () => {
    expect(isLegalChildType(null, "country")).toBe(false);
    expect(isLegalChildType("country", "province")).toBe(false);
    expect(isLegalChildType("country", "town")).toBe(false);
  });
});

describe("geoPath", () => {
  it("builds a path without a region", () => {
    const trail = [node("bc", "province"), node("tofino", "town")];
    expect(geoPath(trail)).toBe("/destinations/bc/tofino");
  });

  it("builds a path with a region and an area", () => {
    const trail = [
      node("bc", "province"),
      node("vancouver-island", "region"), node("tofino", "town"), node("long-beach", "area"),
    ];
    expect(geoPath(trail)).toBe("/destinations/bc/vancouver-island/tofino/long-beach");
  });

  it("returns the landing path for an empty trail", () => {
    expect(geoPath([])).toBe("/destinations");
  });

  it("never emits a trailing slash", () => {
    expect(geoPath([node("bc", "province")]).endsWith("/")).toBe(false);
  });
});

describe("guidePath", () => {
  it("builds a town-scoped guide path", () => {
    const trail = [node("bc", "province"), node("tofino", "town")];
    expect(guidePath(trail, "getting-there")).toBe("/travel-guides/bc/tofino/getting-there");
  });

  it("builds a province-scoped guide path", () => {
    const trail = [node("bc", "province")];
    expect(guidePath(trail, "top-ski-mountains")).toBe("/travel-guides/bc/top-ski-mountains");
  });

  it("builds a scope index path when no guide slug is given", () => {
    const trail = [node("bc", "province"), node("tofino", "town")];
    expect(guidePath(trail)).toBe("/travel-guides/bc/tofino");
  });
});

describe("isRenderable", () => {
  it("renders published and coming_soon only", () => {
    expect(isRenderable("published")).toBe(true);
    expect(isRenderable("coming_soon")).toBe(true);
    expect(isRenderable("draft")).toBe(false);
    expect(isRenderable("hidden")).toBe(false);
    expect(isRenderable("archived")).toBe(false);
  });
});

describe("thin body gate", () => {
  it("counts words across blocks", () => {
    expect(countBodyWords([{ text: "one two three" }, { text: "four five" }])).toBe(5);
    expect(countBodyWords([{}, { text: "  spaced   out  " }])).toBe(2);
  });

  it("flags a body under the threshold", () => {
    expect(isThinBody([{ text: "short" }])).toBe(true);
    expect(isThinBody([{ text: Array(THIN_BODY_WORDS).fill("word").join(" ") }])).toBe(false);
    expect(isThinBody([{ text: Array(THIN_BODY_WORDS - 1).fill("word").join(" ") }])).toBe(true);
  });
});
