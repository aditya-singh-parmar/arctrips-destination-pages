import { describe, it, expect } from "vitest";
import { effectiveStatus, isTrailRenderable } from "./geo";
import type { GeoNode, GeoStatus } from "./geo-types";

function n(slug: string, status: GeoStatus): GeoNode {
  return {
    id: slug, slug, name: slug, type: "town", parentId: null, status,
    body: [], alsoAppearsIn: [], facts: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z",
  };
}

describe("effectiveStatus", () => {
  it("is the node's own status when every ancestor is published", () => {
    expect(effectiveStatus([n("canada", "published"), n("tofino", "published")])).toBe("published");
    expect(effectiveStatus([n("canada", "published"), n("tofino", "coming_soon")])).toBe("coming_soon");
  });

  it("takes the most restrictive status in the chain", () => {
    expect(effectiveStatus([n("canada", "hidden"), n("tofino", "published")])).toBe("hidden");
    expect(effectiveStatus([n("canada", "archived"), n("tofino", "published")])).toBe("archived");
    expect(effectiveStatus([n("canada", "published"), n("bc", "draft"), n("tofino", "published")])).toBe("draft");
  });

  it("prefers archived over hidden over draft", () => {
    expect(effectiveStatus([n("a", "hidden"), n("b", "archived")])).toBe("archived");
    expect(effectiveStatus([n("a", "draft"), n("b", "hidden")])).toBe("hidden");
  });

  it("treats an empty trail as published", () => {
    expect(effectiveStatus([])).toBe("published");
  });
});

describe("isTrailRenderable", () => {
  it("renders only when the whole chain is renderable", () => {
    expect(isTrailRenderable([n("canada", "published"), n("tofino", "coming_soon")])).toBe(true);
    expect(isTrailRenderable([n("canada", "hidden"), n("tofino", "published")])).toBe(false);
    expect(isTrailRenderable([n("canada", "published"), n("tofino", "archived")])).toBe(false);
  });
});
