import { describe, it, expect } from "vitest";
import { classify, slugify, normalizeCopy } from "./decompose.mjs";

const blocks = [
  { style: "Heading1", text: "Best Beaches in Tofino" },
  { style: "Body", text: "Tofino is famous for its beaches." },
  { style: "Heading2", text: "Best Time to Visit Tofino Beaches" },
  { style: "Body", text: "Summer is the warmest and busiest time." },
  { style: "Heading2", text: "Best Beaches in and Around Tofino" },
  { style: "Heading3", text: "Chesterman Beach" },
  { style: "Body", text: "https://www.istockphoto.com/photo/x-gm1", imageRef: "image1.jpg" },
  { style: "Body", text: "Chesterman Beach is one of the most loved beaches in Tofino." },
  { style: "Body", text: "Chesterman Beach is a good place for:" },
  { style: "Body", text: "Long beach walks" },
  { style: "Body", text: "Beginner surf lessons" },
  { style: "Body", text: "Good to know: Always check the tide before walking toward Frank Island." },
  { style: "Heading3", text: "Cox Bay" },
  { style: "Body", text: "Cox Bay is one of the best beaches in Tofino for surfing." },
  { style: "Heading2", text: "Frequently Asked Questions" },
  { style: "Heading3", text: "What is the nicest beach in Tofino?" },
  { style: "Body", text: "Chesterman Beach is the most loved." },
];

const opts = { placeHeadings: ["Best Beaches in and Around Tofino"] };

describe("classify", () => {
  it("promotes H3 under a listing H2 to a place", () => {
    const r = classify(blocks, opts);
    expect(r.places.map((p) => p.name)).toEqual(["Chesterman Beach", "Cox Bay"]);
  });

  it("does not promote FAQ questions to places", () => {
    const r = classify(blocks, opts);
    expect(r.places.find((p) => p.name.startsWith("What is"))).toBeUndefined();
  });

  it("captures FAQ questions and answers separately", () => {
    const r = classify(blocks, opts);
    expect(r.faqs).toEqual([{ q: "What is the nicest beach in Tofino?", a: "Chesterman Beach is the most loved." }]);
  });

  it("puts H1 and non-listing H2 content into the category intro", () => {
    const r = classify(blocks, opts);
    const text = r.intro.map((b) => b.text).join(" ");
    expect(text).toContain("Tofino is famous for its beaches.");
    expect(text).toContain("Summer is the warmest");
    expect(text).not.toContain("Chesterman Beach is one of the most loved");
  });

  it("extracts the good-for bullet list", () => {
    const r = classify(blocks, opts);
    expect(r.places[0].goodFor).toEqual(["Long beach walks", "Beginner surf lessons"]);
  });

  it("extracts the good-to-know note without its label", () => {
    const r = classify(blocks, opts);
    expect(r.places[0].goodToKnow).toBe("Always check the tide before walking toward Frank Island.");
  });

  it("tags images with the place they sit under, and keeps the source url", () => {
    const r = classify(blocks, opts);
    expect(r.images).toEqual([
      { ref: "image1.jpg", placeSlug: "chesterman-beach", sourceUrl: "https://www.istockphoto.com/photo/x-gm1" },
    ]);
  });

  it("drops istock url paragraphs from body copy", () => {
    const r = classify(blocks, opts);
    const body = r.places[0].body.map((b) => b.text).join(" ");
    expect(body).not.toContain("istockphoto");
  });
});

describe("slugify", () => {
  it("handles the renamed-beach case", () => {
    expect(slugify("Tinwis Beach, formerly Mackenzie Beach")).toBe("tinwis-beach-formerly-mackenzie-beach");
  });
  it("strips punctuation and lowercases", () => {
    expect(slugify("St. John's Bay")).toBe("st-johns-bay");
  });
});

describe("normalizeCopy", () => {
  it("replaces a mid-word em dash with a comma", () => {
    expect(normalizeCopy("distance from wildlife—never crowd them")).toBe("distance from wildlife, never crowd them");
  });
  it("replaces a spaced em dash with a comma", () => {
    expect(normalizeCopy("Tofino — wide and wild")).toBe("Tofino, wide and wild");
  });
  it("turns number ranges into 'to'", () => {
    expect(normalizeCopy("open 9—5 daily")).toBe("open 9 to 5 daily");
  });
  it("leaves plain hyphens alone", () => {
    expect(normalizeCopy("storm-watching in Tofino")).toBe("storm-watching in Tofino");
  });
  it("is applied by classify to place body copy", () => {
    const b = [
      { style: "Heading2", text: "Beaches" },
      { style: "Heading3", text: "Cox Bay" },
      { style: "Body", text: "Powerful waves—beginners should go with a school." },
    ];
    const r = classify(b, { placeHeadings: ["Beaches"] });
    expect(r.places[0].body[0].text).toBe("Powerful waves, beginners should go with a school.");
  });
});

/* ── Formatting-debris handling (corpus cleanup, PRD "unformatted text") ──── */

describe("classify: blank spacer headings", () => {
  const withSpacer = [
    { style: "Heading2", text: "Best Beaches in and Around Tofino" },
    { style: "Heading3", text: "Chesterman Beach" },
    { style: "Body", text: "Chesterman Beach is loved." },
    // Word styles the image's own paragraph as a heading with no text.
    { style: "Heading3", text: "", imageRef: "image9.jpg" },
    { style: "Body", text: "Parking fills by nine in summer." },
  ];

  it("does not close the open place", () => {
    const r = classify(withSpacer, opts);
    expect(r.places).toHaveLength(1);
    expect(r.places[0].body.map((b) => b.text)).toEqual([
      "Chesterman Beach is loved.", "Parking fills by nine in summer.",
    ]);
  });

  it("still keeps the image the spacer carried, tagged to the place", () => {
    const r = classify(withSpacer, opts);
    expect(r.images).toEqual([{ ref: "image9.jpg", placeSlug: "chesterman-beach", sourceUrl: undefined }]);
  });
});

describe("classify: iStock URLs", () => {
  it("takes a URL glued onto a heading as the image source, not as the title", () => {
    const r = classify([
      { style: "Heading2", text: "Best Beaches in and Around Tofino" },
      { style: "Heading3", text: "Rochford Squarehttps://www.istockphoto.com/photo/a-gm5", imageRef: "img1.jpg" },
    ], opts);
    expect(r.places[0].name).toBe("Rochford Square");
    expect(r.images[0]).toEqual({ ref: "img1.jpg", placeSlug: "rochford-square", sourceUrl: "https://www.istockphoto.com/photo/a-gm5" });
  });

  it("keeps the copy when a URL is mixed into a real paragraph", () => {
    const r = classify([
      { style: "Body", text: "The gondola climbs the ridge. https://www.istockphoto.com/photo/b-gm2" },
    ], {});
    expect(r.intro).toEqual([{ type: "p", text: "The gondola climbs the ridge." }]);
  });
});

describe("classify: sentence headings and table headers", () => {
  it("demotes a heading that is a whole sentence to body copy", () => {
    const sentence = "Tofino sits at the end of a long highway and the drive itself takes most of a day to complete";
    const r = classify([{ style: "Heading2", text: sentence }], {});
    expect(r.intro).toEqual([{ type: "p", text: sentence }]);
  });

  it("keeps a long question as a heading", () => {
    const q = `${"Is the drive from Victoria to Tofino really worth doing in a single day".padEnd(95, " x")}?`;
    const r = classify([{ style: "Heading2", text: q }], {});
    expect(r.intro[0].type).toBe("h");
  });

  it("drops a flattened table header row", () => {
    const r = classify([{ style: "Body", text: "Beach · Location · Best For", table: true, tableHeader: true }], {});
    expect(r.intro).toEqual([]);
  });

  it("drops table-header debris out of good_for", () => {
    const r = classify([
      { style: "Heading2", text: "Best Beaches in and Around Tofino" },
      { style: "Heading3", text: "Cox Bay" },
      { style: "Body", text: "Cox Bay is good for:" },
      { style: "Body", text: "Location" },
      { style: "Body", text: "Surfing" },
    ], opts);
    expect(r.places[0].goodFor).toEqual(["Surfing"]);
  });
});

describe("classify: placeLevel h2", () => {
  const numbered = [
    { style: "Heading1", text: "Scenic Spots in Victoria" },
    { style: "Body", text: "Victoria rewards a slow walk." },
    { style: "Heading2", text: "1. Mount Douglas Park" },
    { style: "Body", text: "The summit gives the widest view in the city." },
    { style: "Heading2", text: "2. Ogden Point Breakwater" },
    { style: "Body", text: "A long concrete arm into the strait." },
    { style: "Heading2", text: "Frequently Asked Questions" },
    { style: "Heading3", text: "When should I go?" },
    { style: "Body", text: "Late spring." },
  ];

  it("makes each numbered H2 a place and strips the number", () => {
    const r = classify(numbered, { placeLevel: "h2" });
    expect(r.places.map((p) => p.name)).toEqual(["Mount Douglas Park", "Ogden Point Breakwater"]);
    expect(r.places[0].slug).toBe("mount-douglas-park");
  });

  it("still routes the FAQ section to faqs", () => {
    const r = classify(numbered, { placeLevel: "h2" });
    expect(r.faqs).toEqual([{ q: "When should I go?", a: "Late spring." }]);
  });

  it("keeps the unnumbered preamble in the intro", () => {
    const r = classify(numbered, { placeLevel: "h2" });
    expect(r.intro).toEqual([
      { type: "h", text: "Scenic Spots in Victoria" },
      { type: "p", text: "Victoria rewards a slow walk." },
    ]);
  });
});

describe("classify: duplicate place headings", () => {
  it("keeps the first and folds the repeat into it, so the unique index holds", () => {
    const r = classify([
      { style: "Heading2", text: "Best Beaches in and Around Tofino" },
      { style: "Heading3", text: "Cox Bay" },
      { style: "Body", text: "First mention." },
      { style: "Heading3", text: "Cox Bay" },
      { style: "Body", text: "Second mention." },
    ], opts);
    expect(r.places).toHaveLength(1);
    expect(r.places[0].body.map((b) => b.text)).toEqual(["First mention.", "Second mention."]);
  });
});

describe("classify: image attribution order", () => {
  it("matches a URL that comes BEFORE its image, the corpus' usual order", () => {
    const r = classify([
      { style: "Body", text: "https://www.istockphoto.com/photo/swan-lake-gm1" },
      { style: "Heading3", text: "", imageRef: "image31.jpg" },
    ], {});
    expect(r.images[0].sourceUrl).toBe("https://www.istockphoto.com/photo/swan-lake-gm1");
  });

  it("still matches a URL that comes after its image", () => {
    const r = classify([
      { style: "Body", text: "", imageRef: "a.jpg" },
      { style: "Body", text: "https://www.istockphoto.com/photo/after-gm2" },
    ], {});
    expect(r.images[0].sourceUrl).toBe("https://www.istockphoto.com/photo/after-gm2");
  });

  it("pairs a run of URLs with a run of images in order", () => {
    const r = classify([
      { style: "Body", text: "https://www.istockphoto.com/photo/one-gm1" },
      { style: "Body", text: "https://www.istockphoto.com/photo/two-gm2" },
      { style: "Body", text: "", imageRef: "one.jpg" },
      { style: "Body", text: "", imageRef: "two.jpg" },
    ], {});
    expect(r.images.map((i) => i.sourceUrl)).toEqual([
      "https://www.istockphoto.com/photo/one-gm1", "https://www.istockphoto.com/photo/two-gm2",
    ]);
  });

  it("does not carry an attribution across a place boundary", () => {
    const r = classify([
      { style: "Heading2", text: "Best Beaches in and Around Tofino" },
      { style: "Heading3", text: "Cox Bay" },
      { style: "Body", text: "https://www.istockphoto.com/photo/stray-gm9" },
      { style: "Heading3", text: "Chesterman Beach" },
      { style: "Body", text: "", imageRef: "c.jpg" },
    ], opts);
    expect(r.images[0].sourceUrl).toBeUndefined();
  });
});

describe("classify: flattened table rows", () => {
  it("marks a table row so it is kept but never read as a lead paragraph", () => {
    const r = classify([
      { style: "Body", text: "Banff rewards a slow week." },
      { style: "Body", text: "Lake Louise · Moraine Lake · Bow Falls", table: true },
    ], {});
    expect(r.intro).toEqual([
      { type: "p", text: "Banff rewards a slow week." },
      { type: "p", text: "Lake Louise · Moraine Lake · Bow Falls", table: true },
    ]);
  });

  it("keeps a flattened table row out of good_for", () => {
    const r = classify([
      { style: "Heading2", text: "Best Beaches in and Around Tofino" },
      { style: "Heading3", text: "Cox Bay" },
      { style: "Body", text: "Cox Bay is good for:" },
      { style: "Body", text: "Cox Bay · Tofino · Surfing", table: true },
      { style: "Body", text: "Surfing" },
    ], opts);
    expect(r.places[0].goodFor).toEqual(["Surfing"]);
  });
});
