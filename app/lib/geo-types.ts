/**
 * The geographic tree: province > [region >] town > area.
 * Pure types and rules, no I/O, so the resolver can be unit-tested.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 3.2.
 *
 * Country was the root until 2026-07-30. Arc Trips publishes only in British
 * Columbia, so Canada was a level the reader walked through for nothing and it
 * was removed from the tree; see docs/qa/bc-root-contract.md. The value stays
 * in the union because the geo_places check constraint still accepts it and a
 * historical row may be read, but no country node is routable: it is not a
 * legal child of the root, so any path through one resolves to not-found.
 */
import type { ArticleBlock } from "./content";

export type GeoType = "country" | "province" | "region" | "town" | "area";
export type GeoStatus = "draft" | "coming_soon" | "published" | "hidden" | "archived";

export type GeoNode = {
  id: string;
  slug: string;
  /** Correct orthography, never an ASCII approximation. */
  name: string;
  type: GeoType;
  parentId: string | null;
  status: GeoStatus;
  heroPublicId?: string;
  standfirst?: string;
  body: ArticleBlock[];
  lat?: number;
  lng?: number;
  /** Set at country level, inherited by descendants. */
  timezone?: string;
  currency?: string;
  unitSystem?: string;
  /** Areas only: other towns that link here. Canonical still follows parentId. */
  alsoAppearsIn: string[];
  /** Editor-authored key facts for the orientation strip (PRD 6.2). */
  facts: { k: string; v: string }[];
  seoTitle?: string;
  seoDescription?: string;
  sortPriority: number;
  updatedAt: string;
};

/**
 * The root parents a province directly. Region is optional, so a province may
 * parent either a region or a town, which is why a town sits at segment 1 or 2
 * and every deeper segment shifts with it.
 *
 * `country` parents nothing and is parented by nothing: a stale country row
 * cannot be walked into or out of.
 */
const LEGAL_CHILDREN: Record<string, GeoType[]> = {
  root: ["province"],
  country: [],
  province: ["region", "town"],
  region: ["town"],
  town: ["area"],
  area: [],
};

export function isLegalChildType(parent: GeoType | null, child: GeoType): boolean {
  return LEGAL_CHILDREN[parent ?? "root"].includes(child);
}

/** Renders a 200. draft and hidden 404, archived 410. */
export function isRenderable(status: GeoStatus): boolean {
  return status === "published" || status === "coming_soon";
}

function segments(trail: GeoNode[]): string {
  return trail.map((n) => n.slug).join("/");
}

/** Canonical destination path. Never carries a trailing slash. */
export function geoPath(trail: GeoNode[]): string {
  return trail.length ? `/destinations/${segments(trail)}` : "/destinations";
}

/**
 * Canonical guide path. The location path may terminate at province, region
 * or town, which is what gives the regional roundups a legal URL.
 */
export function guidePath(trail: GeoNode[], guideSlug?: string): string {
  const base = trail.length ? `/travel-guides/${segments(trail)}` : "/travel-guides";
  return guideSlug ? `${base}/${guideSlug}` : base;
}

/**
 * A category page below this many rendered words is a thin page: Google drops
 * it as a soft 404 and it costs crawl budget on the way. Such a page still
 * renders, because it may carry a real booking path, but it is kept out of
 * the index and out of the sitemap (AC 11, spec section 6).
 */
export const THIN_BODY_WORDS = 250;

export function countBodyWords(blocks: { text?: string }[]): number {
  return blocks.reduce((n, b) => n + (b.text ? b.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
}

export function isThinBody(blocks: { text?: string }[]): boolean {
  return countBodyWords(blocks) < THIN_BODY_WORDS;
}
