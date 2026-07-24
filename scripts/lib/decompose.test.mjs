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
