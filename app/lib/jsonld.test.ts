import { describe, it, expect } from "vitest";
import { breadcrumbList, touristDestination, itemList, faqPage, articleLd } from "./jsonld";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("breadcrumbList", () => {
  it("numbers positions from one and carries urls", () => {
    const ld = breadcrumbList([
      { name: "Destinations", url: "https://arctrips.com/destinations" },
      { name: "British Columbia", url: "https://arctrips.com/destinations/bc" },
      { name: "Tofino" },
    ]) as any;
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[2].position).toBe(3);
    expect(ld.itemListElement[2].item).toBeUndefined();
    expect(ld.itemListElement[1].item).toBe("https://arctrips.com/destinations/bc");
  });
});

describe("touristDestination", () => {
  it("carries name, url and geo when present", () => {
    const ld = touristDestination(
      { name: "Tofino", lat: 49.15, lng: -125.9 },
      "https://arctrips.com/destinations/bc/vancouver-island/tofino",
      "A surf town",
    ) as any;
    expect(ld["@type"]).toBe("TouristDestination");
    expect(ld.name).toBe("Tofino");
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 49.15, longitude: -125.9 });
  });

  it("omits geo when there are no coordinates", () => {
    const ld = touristDestination({ name: "Ucluelet" }, "https://arctrips.com/x") as any;
    expect(ld.geo).toBeUndefined();
  });
});

describe("itemList", () => {
  it("numbers items from one", () => {
    const ld = itemList([{ name: "Surfing", url: "https://a/1" }, { name: "Beaches", url: "https://a/2" }]) as any;
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, name: "Beaches", url: "https://a/2" });
  });

  it("returns null for an empty list so no empty block is emitted", () => {
    expect(itemList([])).toBeNull();
  });
});

describe("faqPage", () => {
  it("maps each pair to a Question with an acceptedAnswer", () => {
    const ld = faqPage([{ q: "Can you swim?", a: "Yes, in summer." }]) as any;
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]["@type"]).toBe("Question");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("Yes, in summer.");
  });

  it("returns null for an empty list so no empty block is emitted", () => {
    expect(faqPage([])).toBeNull();
  });
});

describe("articleLd", () => {
  it("carries both dates and the author", () => {
    const ld = articleLd({
      title: "Storm watching", url: "https://a/s",
      published: "2026-01-02T00:00:00Z", updated: "2026-03-04T00:00:00Z", author: "Arc Trips",
    }) as any;
    expect(ld["@type"]).toBe("Article");
    expect(ld.datePublished).toBe("2026-01-02T00:00:00Z");
    expect(ld.dateModified).toBe("2026-03-04T00:00:00Z");
    expect(ld.author).toEqual({ "@type": "Organization", name: "Arc Trips" });
  });

  it("defaults the author to Arc Trips", () => {
    const ld = articleLd({ title: "x", url: "https://a/x" }) as any;
    expect(ld.author.name).toBe("Arc Trips");
  });
});
