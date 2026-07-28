import { describe, it, expect } from "vitest";
import {
  splitUrls, pickSourceUrl, isSpacerHeading, isSentenceHeading, stripListNumber,
  isNumberedHeading, isTableFragment, cleanGoodFor, sameText, splitBlurb, isRestatementOf,
  readCmsField,
  isCmsField,
  stripEditorNotes,
  hasEditorNote,
} from "./clean.mjs";

describe("splitUrls", () => {
  it("returns the text unchanged when there is no URL", () => {
    expect(splitUrls("Long Beach is the longest.")).toEqual({ text: "Long Beach is the longest.", urls: [] });
  });

  it("pulls a URL glued onto the end of a heading", () => {
    const out = splitUrls("3. Rochford Squarehttps://www.istockphoto.com/photo/flower-gm5");
    expect(out.text).toBe("3. Rochford Square");
    expect(out.urls).toEqual(["https://www.istockphoto.com/photo/flower-gm5"]);
  });

  it("leaves an attribution-only paragraph with empty text", () => {
    const out = splitUrls("https://www.istockphoto.com/photo/x-gm1");
    expect(out.text).toBe("");
    expect(out.urls).toHaveLength(1);
  });
});

describe("pickSourceUrl", () => {
  it("prefers an iStock URL over any other", () => {
    expect(pickSourceUrl(["https://example.com/a", "https://www.istockphoto.com/photo/b"]))
      .toBe("https://www.istockphoto.com/photo/b");
  });
  it("is undefined for an empty list", () => {
    expect(pickSourceUrl([])).toBeUndefined();
  });
});

describe("isSpacerHeading", () => {
  it("is true for an empty heading", () => {
    expect(isSpacerHeading("")).toBe(true);
    expect(isSpacerHeading("   ")).toBe(true);
  });
  it("is true for a heading left with only a list number", () => {
    expect(isSpacerHeading("4.")).toBe(true);
  });
  it("is false for a real title", () => {
    expect(isSpacerHeading("Long Beach")).toBe(false);
  });
});

describe("isSentenceHeading", () => {
  it("is true for a heading over ninety characters", () => {
    expect(isSentenceHeading("a".repeat(120))).toBe(true);
  });
  it("exempts questions, which are legitimate FAQ headings", () => {
    expect(isSentenceHeading(`${"a".repeat(120)}?`)).toBe(false);
  });
  it("is false for a normal title", () => {
    expect(isSentenceHeading("Best Beaches in Tofino")).toBe(false);
  });
});

describe("stripListNumber / isNumberedHeading", () => {
  it("strips the numbering used by the roundup docs", () => {
    expect(stripListNumber("12. Mount Douglas Park")).toBe("Mount Douglas Park");
    expect(stripListNumber("2)  Beaconsfield House")).toBe("Beaconsfield House");
  });
  it("leaves an unnumbered title alone", () => {
    expect(stripListNumber("Cox Bay")).toBe("Cox Bay");
    expect(isNumberedHeading("Cox Bay")).toBe(false);
    expect(isNumberedHeading("1. Cox Bay")).toBe(true);
  });
});

describe("isTableFragment", () => {
  it("catches a whole flattened header row", () => {
    expect(isTableFragment("Beach · Location · Best For")).toBe(true);
    expect(isTableFragment("beach - location - best for")).toBe(true);
  });
  it("catches one orphaned header cell", () => {
    expect(isTableFragment("Location")).toBe(true);
    expect(isTableFragment("Best For")).toBe(true);
  });
  it("keeps a real bullet", () => {
    expect(isTableFragment("Families with young kids")).toBe(false);
    expect(isTableFragment("Sunset walks")).toBe(false);
  });
});

describe("cleanGoodFor", () => {
  it("drops header debris, duplicates and paragraphs", () => {
    expect(cleanGoodFor([
      "Beach · Location · Best For", "Surfing", "surfing", "Location", "",
      "A very long line that is clearly a paragraph of body copy and not a bullet at all",
    ])).toEqual(["Surfing"]);
  });
  it("strips bullet glyphs", () => {
    expect(cleanGoodFor(["• Sunset walks"])).toEqual(["Sunset walks"]);
  });
});

describe("sameText", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(sameText("Long  Beach, BC.", "long beach bc")).toBe(true);
    expect(sameText("Long Beach", "Cox Bay")).toBe(false);
  });
});

describe("splitBlurb", () => {
  it("lifts the opening paragraph out of the body so it is never printed twice", () => {
    const { blurb, body } = splitBlurb([
      { type: "p", text: "Long Beach is the longest beach on the coast." },
      { type: "p", text: "Parking is at the Incinerator Rock lot." },
    ]);
    expect(blurb).toBe("Long Beach is the longest beach on the coast.");
    expect(body).toEqual([{ type: "p", text: "Parking is at the Incinerator Rock lot." }]);
  });

  it("keeps a very long opening paragraph in the body and summarises it", () => {
    const long = `${"First sentence here. ".repeat(20)}`.trim();
    const { blurb, body } = splitBlurb([{ type: "p", text: long }]);
    expect(blurb.length).toBeLessThanOrEqual(320);
    expect(body).toHaveLength(1);
  });

  it("survives a body with no paragraph", () => {
    expect(splitBlurb([])).toEqual({ blurb: "", body: [] });
  });
});

describe("isRestatementOf", () => {
  const lead = "Banff is a picturesque town in the heart of the Canadian Rockies, known for mountain views.";
  it("catches a paragraph whose opening is the standfirst", () => {
    expect(isRestatementOf(`${lead} It was established in 1885.`, lead)).toBe(true);
  });
  it("catches an exact repeat", () => {
    expect(isRestatementOf(lead, lead)).toBe(true);
  });
  it("is false for different copy", () => {
    expect(isRestatementOf("The gondola climbs Sulphur Mountain in eight minutes.", lead)).toBe(false);
  });
  it("does not fire on a short coincidental overlap", () => {
    expect(isRestatementOf("Banff is a town.", "Banff is a town in Alberta with a long main street and many shops.")).toBe(false);
  });
});

describe("readCmsField", () => {
  it("recognises a meta description typed into the body", () => {
    const r = readCmsField("Meta Description:Discover the best hikes in Squamish, BC.");
    expect(r.field).toBe("meta-description");
    expect(r.value).toBe("Discover the best hikes in Squamish, BC.");
  });

  it("handles a space after the colon and other field names", () => {
    expect(readCmsField("Meta Title: Best Hikes").field).toBe("meta-title");
    expect(readCmsField("Slug: best-hikes").value).toBe("best-hikes");
    expect(readCmsField("Keywords: hiking, squamish").field).toBe("keywords");
  });

  it("leaves real copy alone", () => {
    expect(readCmsField("Squamish is great for hiking: here is why.")).toBeNull();
    expect(readCmsField("Tofino is famous for its beaches.")).toBeNull();
    expect(isCmsField("The water can come in and cover the sandspit.")).toBe(false);
  });
});

describe("splitUrls with truncated schemes", () => {
  it("catches a URL whose leading characters Word shore off", () => {
    const r = splitUrls("ttps://www.istockphoto.com/photo/scenery-along-the-tofino-shoreline");
    expect(r.urls).toHaveLength(1);
    expect(r.text).toBe("");
  });

  it("catches a bare www host", () => {
    const r = splitUrls("Credit www.istockphoto.com/photo/abc");
    expect(r.urls).toHaveLength(1);
    expect(r.text).toBe("Credit");
  });

  it("still catches a normal URL and leaves copy intact", () => {
    const r = splitUrls("Photo: https://www.istockphoto.com/photo/abc more text");
    expect(r.urls).toHaveLength(1);
    expect(r.text).toBe("Photo: more text");
  });

  it("does not eat ordinary prose", () => {
    expect(splitUrls("The tide can cover the sandspit.").urls).toHaveLength(0);
  });
});

describe("stripEditorNotes", () => {
  it("removes a note and keeps the sentence", () => {
    expect(stripEditorNotes("Explore Pacific Rim National Park Reserve (add Wickannish trail)"))
      .toBe("Explore Pacific Rim National Park Reserve");
  });

  it("catches the other markers", () => {
    expect(stripEditorNotes("Trail info (TODO verify distance) here")).toBe("Trail info here");
    expect(hasEditorNote("Rates vary (check with the operator)")).toBe(true);
  });

  it("leaves real parentheticals alone", () => {
    const real = "Always check the tide (the water can cover the sandspit).";
    expect(stripEditorNotes(real)).toBe(real);
    expect(hasEditorNote("(check local fire bans/permits first)")).toBe(false);
  });
});
