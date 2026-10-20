import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { ROUTES, canonicalFor, NOINDEX_ROUTES, SITE_ORIGIN } from "./routes.mjs";

const PUBLIC = "public/prototype";
const entries = Object.entries(ROUTES);

describe("URL contract", () => {
  it("has no duplicate routes", () => {
    const routes = entries.map(([, r]) => r);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("uses lowercase, hyphenated segments, at most two deep, no trailing slash", () => {
    for (const [, route] of entries) {
      expect(route, route).toMatch(/^\/$|^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/);
    }
  });

  it("points every route at a file that is deployed", () => {
    for (const [file] of entries) expect(existsSync(`${PUBLIC}/${file}`), file).toBe(true);
  });

  it("routes every deployed page (underscore files are internal)", () => {
    const pages = readdirSync(PUBLIC).filter((f) => f.endsWith(".html") && !f.startsWith("_"));
    const unrouted = pages.filter((f) => !(f in ROUTES));
    expect(unrouted).toEqual([]);
  });

  it("gives every indexable page a canonical equal to its route", () => {
    for (const [file, route] of entries) {
      if (NOINDEX_ROUTES.includes(route)) continue;
      const html = readFileSync(`${PUBLIC}/${file}`, "utf8");
      expect(html, file).toContain(`<link rel="canonical" href="${canonicalFor(route)}">`);
    }
  });

  it("keeps noindex routes noindex and canonical-free", () => {
    for (const [file, route] of entries) {
      if (!NOINDEX_ROUTES.includes(route)) continue;
      const html = readFileSync(`${PUBLIC}/${file}`, "utf8");
      expect(html, file).toContain('name="robots" content="noindex');
      expect(html, file).not.toContain('rel="canonical"');
    }
  });

  it("builds canonicals on an https origin with no trailing slash", () => {
    expect(SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
    expect(canonicalFor("/tofino/hiking")).toBe(`${SITE_ORIGIN}/tofino/hiking`);
    expect(canonicalFor("/")).toBe(SITE_ORIGIN);
  });
});
