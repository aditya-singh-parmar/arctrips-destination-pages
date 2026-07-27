import { describe, it, expect } from "vitest";
import { toAsciiSlug, isReservedSlug } from "./slug";

describe("toAsciiSlug", () => {
  it("lowercases and hyphenates plain names", () => {
    expect(toAsciiSlug("Long Beach")).toBe("long-beach");
    expect(toAsciiSlug("Sidney & the Saanich Peninsula")).toBe("sidney-and-the-saanich-peninsula");
  });

  it("strips diacritics to their ASCII base", () => {
    expect(toAsciiSlug("Québec City")).toBe("quebec-city");
    expect(toAsciiSlug("Tofino Inlet")).toBe("tofino-inlet");
  });

  it("transliterates Nuu-chah-nulth orthography", () => {
    expect(toAsciiSlug("ʔapsčiik t̓ašii")).toBe("apsciik-tasii");
    expect(toAsciiSlug("Yuułuʔiłʔatḥ")).toBe("yuuluilath");
  });

  it("collapses runs and trims separators", () => {
    expect(toAsciiSlug("  Hot  Springs -- Cove  ")).toBe("hot-springs-cove");
    expect(toAsciiSlug("1. Lake Louise")).toBe("1-lake-louise");
  });

  it("never returns an empty slug", () => {
    expect(toAsciiSlug("ʔ")).toBe("place");
    expect(toAsciiSlug("")).toBe("place");
  });
});

describe("isReservedSlug", () => {
  it("flags the reserved destination words", () => {
    expect(isReservedSlug("things-to-do")).toBe(true);
    expect(isReservedSlug("plan")).toBe(true);
    expect(isReservedSlug("compare")).toBe(true);
  });

  it("passes real area slugs", () => {
    expect(isReservedSlug("long-beach")).toBe(false);
  });
});
