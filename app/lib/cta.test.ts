import { describe, it, expect } from "vitest";
import { resolveCta } from "./cta";

const stayExp = { slug: "cabin", productLineSlug: "stays", title: "Riverside Cabin", priceFrom: 320 } as never;
const charter = { slug: "salmon", productLineSlug: "fishing-charters", title: "Half day salmon", priceFrom: 189 } as never;

describe("resolveCta", () => {
  it("uses the category's live product line as primary", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "fishing", experiences: [charter, stayExp] });
    expect(r.primary.kind).toBe("sister-brand");
    expect(r.primary.productLineSlug).toBe("fishing-charters");
    expect(r.primary.label).toBe("Book a charter on ArcTrips Fishing");
    expect(r.primary.external).toBe(true);
  });

  it("promotes stays to primary and shows capture when the line is coming soon", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "whale-watching", experiences: [stayExp] });
    expect(r.primary.kind).toBe("stays");
    expect(r.primary.productLineSlug).toBe("stays");
    expect(r.notify?.productLineSlug).toBe("whale-watching-tours");
    expect(r.notify?.label).toBe("Notify me when tours open");
  });

  it("falls back to stays for a category with no product line at all", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "beaches", experiences: [stayExp] });
    expect(r.primary.kind).toBe("stays");
    expect(r.notify).toBeUndefined();
  });

  it("never returns a dead end: no experiences still yields a stays primary", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "beaches", experiences: [] });
    expect(r.primary).toBeDefined();
    expect(r.primary.kind).toBe("stays");
  });

  it("returns exactly one primary", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "whale-watching", experiences: [stayExp] });
    const primaries = [r.primary, r.notify].filter((c) => c && "isPrimary" in c && c.isPrimary);
    expect(primaries).toHaveLength(1);
  });

  it("scopes the stays label to the category when it is a fallback", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "whale-watching", experiences: [stayExp] });
    expect(r.primary.label).toBe("Book a stay for whale watching season");
  });
});
