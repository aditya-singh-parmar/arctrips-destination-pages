import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { ROUTES, ALIASES, canonicalFor, NOINDEX_ROUTES, SITE_ORIGIN } from "./routes.mjs";

const PUBLIC = "public/prototype";
const entries = Object.entries(ROUTES);

describe("URL contract", () => {
  it("has no duplicate routes", () => {
    const routes = entries.map(([, r]) => r);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("uses lowercase, hyphenated segments and no trailing slash", () => {
    for (const [, route] of entries) {
      expect(route, route).toMatch(/^(\/[a-z0-9-]+)+$/);
    }
  });

  it("follows the PRD: {section}/{country}/{province}/{town}/{slug}", () => {
    const SECTIONS = ["destinations", "travel-guides", "whale-watching", "kayaking", "fishing", "blog"];
    for (const [file, route] of entries) {
      if (["/search", "/not-found"].includes(route)) continue; // not location pages
      const seg = route.split("/").filter(Boolean);
      const section = seg[0] === "blog" ? seg[1] : seg[0]; // blog/{section}/...
      expect(SECTIONS, `${file} -> ${route}`).toContain(seg[0]);
      const loc = seg[0] === "blog" ? seg.slice(2) : seg.slice(1);
      expect(loc[0], route).toBe("canada");
      expect(loc[1], route).toMatch(/^[a-z]{2}$/); // province: bc, ab, qc ...
      expect(section).toBeTruthy();
    }
  });

  it("has no serif, trailing-slash or legacy-flat route left", () => {
    for (const [, route] of entries) {
      expect(route, route).not.toMatch(/^\/(tofino|ucluelet|vancouver-island)(\/|$)/);
      expect(route.endsWith("/"), route).toBe(false);
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

  it("serves aliases from a real page, and the page names its real route as canonical", () => {
    const fileToRoute = Object.fromEntries(entries);
    for (const [alias, file] of Object.entries(ALIASES)) {
      expect(fileToRoute[file], alias).toBeTruthy();
      expect(Object.values(ROUTES), alias).not.toContain(alias === "/" ? "/x" : alias);
      const html = readFileSync(`${PUBLIC}/${file}`, "utf8");
      expect(html, alias).toContain(`<link rel="canonical" href="${canonicalFor(fileToRoute[file])}">`);
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
