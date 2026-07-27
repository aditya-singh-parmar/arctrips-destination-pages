import { describe, it, expect } from "vitest";
import { resolveDestinationPath, resolveGuidePath, guideBelongsToScope, type GeoLookup } from "./resolver";
import type { GeoNode } from "./geo-types";

function n(slug: string, type: GeoNode["type"], parentId: string | null): GeoNode {
  return {
    id: slug, slug, name: slug, type, parentId, status: "published",
    body: [], alsoAppearsIn: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z",
  };
}

// canada > bc > { vancouver-island > tofino > long-beach , squamish }
const NODES: GeoNode[] = [
  n("canada", "country", null),
  n("bc", "province", "canada"),
  n("vancouver-island", "region", "bc"),
  n("tofino", "town", "vancouver-island"),
  n("long-beach", "area", "tofino"),
  n("squamish", "town", "bc"),
];

const lookup: GeoLookup = async (slug, parentId) =>
  NODES.find((x) => x.slug === slug && x.parentId === parentId) ?? null;

describe("resolveDestinationPath", () => {
  it("resolves the landing page", async () => {
    expect((await resolveDestinationPath([], lookup)).kind).toBe("landing");
  });

  it("resolves each geographic tier", async () => {
    expect((await resolveDestinationPath(["canada"], lookup)).kind).toBe("geo");
    const prov = await resolveDestinationPath(["canada", "bc"], lookup);
    expect(prov.kind === "geo" && prov.node.type).toBe("province");
    const region = await resolveDestinationPath(["canada", "bc", "vancouver-island"], lookup);
    expect(region.kind === "geo" && region.node.type).toBe("region");
  });

  it("resolves a town with a region in the path", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "vancouver-island", "tofino"], lookup);
    expect(r.kind === "geo" && r.node.slug).toBe("tofino");
    expect(r.kind === "geo" && r.trail.map((t) => t.slug)).toEqual(["canada", "bc", "vancouver-island", "tofino"]);
  });

  it("resolves a town with no region in the path", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "squamish"], lookup);
    expect(r.kind === "geo" && r.node.type).toBe("town");
  });

  it("resolves an area", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "vancouver-island", "tofino", "long-beach"], lookup);
    expect(r.kind === "geo" && r.node.type).toBe("area");
  });

  it("resolves the things-to-do index and a category page", async () => {
    const base = ["canada", "bc", "vancouver-island", "tofino"];
    expect((await resolveDestinationPath([...base, "things-to-do"], lookup)).kind).toBe("things-to-do");
    const cat = await resolveDestinationPath([...base, "things-to-do", "surfing"], lookup);
    expect(cat.kind === "category" && cat.categorySlug).toBe("surfing");
    expect(cat.kind === "category" && cat.town.slug).toBe("tofino");
  });

  it("resolves the plan index", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "squamish", "plan"], lookup);
    expect(r.kind === "plan" && r.town.slug).toBe("squamish");
  });

  it("resolves a comparison", async () => {
    const r = await resolveDestinationPath(["compare", "squamish-vs-whistler"], lookup);
    expect(r).toMatchObject({ kind: "compare", a: "squamish", b: "whistler" });
  });

  it("rejects reserved words anywhere but under a town", async () => {
    expect((await resolveDestinationPath(["canada", "bc", "things-to-do"], lookup)).kind).toBe("not-found");
    expect((await resolveDestinationPath(["canada", "plan"], lookup)).kind).toBe("not-found");
  });

  it("rejects a category with no things-to-do segment", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "squamish", "surfing"], lookup);
    expect(r.kind).toBe("not-found");
  });

  it("rejects a skipped tier", async () => {
    expect((await resolveDestinationPath(["tofino"], lookup)).kind).toBe("not-found");
    expect((await resolveDestinationPath(["canada", "tofino"], lookup)).kind).toBe("not-found");
  });

  it("rejects an unknown slug", async () => {
    expect((await resolveDestinationPath(["canada", "bc", "nowhere"], lookup)).kind).toBe("not-found");
  });

  it("rejects a path past an area", async () => {
    const r = await resolveDestinationPath(
      ["canada", "bc", "vancouver-island", "tofino", "long-beach", "extra"], lookup);
    expect(r.kind).toBe("not-found");
  });

  it("rejects a malformed comparison", async () => {
    expect((await resolveDestinationPath(["compare"], lookup)).kind).toBe("not-found");
    expect((await resolveDestinationPath(["compare", "squamish"], lookup)).kind).toBe("not-found");
  });
});

describe("resolveGuidePath", () => {
  it("resolves the guides landing page", async () => {
    expect((await resolveGuidePath([], lookup)).kind).toBe("landing");
  });

  it("resolves a town-scoped guide index", async () => {
    const r = await resolveGuidePath(["canada", "bc", "squamish"], lookup);
    expect(r.kind === "index" && r.scope.slug).toBe("squamish");
  });

  it("prefers a region node over a guide slug at the same segment", async () => {
    const r = await resolveGuidePath(["canada", "bc", "vancouver-island"], lookup);
    expect(r.kind === "index" && r.scope.type).toBe("region");
  });

  it("resolves a province-scoped guide", async () => {
    const r = await resolveGuidePath(["canada", "bc", "top-ski-mountains"], lookup);
    expect(r.kind === "guide" && r.slug).toBe("top-ski-mountains");
    expect(r.kind === "guide" && r.scope.slug).toBe("bc");
  });

  it("resolves a region-scoped guide", async () => {
    const r = await resolveGuidePath(["canada", "bc", "vancouver-island", "best-beaches"], lookup);
    expect(r.kind === "guide" && r.slug).toBe("best-beaches");
    expect(r.kind === "guide" && r.scope.type).toBe("region");
  });

  it("resolves a town-scoped guide with and without a region", async () => {
    const withRegion = await resolveGuidePath(
      ["canada", "bc", "vancouver-island", "tofino", "getting-there"], lookup);
    expect(withRegion.kind === "guide" && withRegion.scope.slug).toBe("tofino");
    const without = await resolveGuidePath(["canada", "bc", "squamish", "what-to-pack"], lookup);
    expect(without.kind === "guide" && without.scope.slug).toBe("squamish");
  });

  it("rejects a guide scoped above province", async () => {
    expect((await resolveGuidePath(["canada", "some-guide"], lookup)).kind).toBe("not-found");
  });

  it("rejects a guide slug that is not the last segment", async () => {
    const r = await resolveGuidePath(["canada", "bc", "some-guide", "another"], lookup);
    expect(r.kind).toBe("not-found");
  });

  it("rejects a guide scoped to an area", async () => {
    const r = await resolveGuidePath(
      ["canada", "bc", "vancouver-island", "tofino", "long-beach", "a-guide"], lookup);
    expect(r.kind).toBe("not-found");
  });
});

describe("guideBelongsToScope", () => {
  const tofino = n("tofino", "town", "vancouver-island");
  const island = n("vancouver-island", "region", "bc");
  const bc = n("bc", "province", "canada");

  it("places a town guide at its town only", () => {
    const a = { destinationSlug: "tofino", citySlugs: ["tofino"] };
    expect(guideBelongsToScope(a, tofino)).toBe(true);
    expect(guideBelongsToScope(a, island)).toBe(false);
    expect(guideBelongsToScope(a, bc)).toBe(false);
  });

  it("gives a two-town guide one home, at its owning town", () => {
    const a = { destinationSlug: "tofino", citySlugs: ["tofino", "ucluelet"] };
    const ucluelet = n("ucluelet", "town", "vancouver-island");
    expect(guideBelongsToScope(a, tofino)).toBe(true);
    // Cross-linked from Ucluelet, never rendered there.
    expect(guideBelongsToScope(a, ucluelet)).toBe(false);
  });

  it("places a regional roundup at its region only", () => {
    const a = { regionSlug: "vancouver-island", citySlugs: [] };
    expect(guideBelongsToScope(a, island)).toBe(true);
    expect(guideBelongsToScope(a, tofino)).toBe(false);
    expect(guideBelongsToScope(a, bc)).toBe(false);
  });

  it("keeps a city-tagged article off the region URL", () => {
    const a = { regionSlug: "vancouver-island", citySlugs: ["tofino"] };
    expect(guideBelongsToScope(a, island)).toBe(false);
  });

  it("renders nothing at province scope until the corpus carries one", () => {
    expect(guideBelongsToScope({ regionSlug: "vancouver-island" }, bc)).toBe(false);
    expect(guideBelongsToScope({ citySlugs: ["tofino"] }, bc)).toBe(false);
  });
});
