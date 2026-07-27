/**
 * Reads for the geographic tree. Mirrors the Supabase-to-SEED fallback pattern
 * in app/lib/content.ts, so every page renders with or without a database.
 * While supabase/migrations/0003_geo_tree.sql is unapplied, every read here
 * falls through to SEED_GEO and the tree still serves.
 */
import { getServerSupabase } from "./supabase";
import { getNavigableSlugs, type ArticleBlock } from "./content";
import { geoPath, isRenderable, type GeoNode, type GeoStatus, type GeoType } from "./geo-types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToNode(r: any): GeoNode {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type as GeoType,
    parentId: r.parent_id ?? null,
    status: r.status,
    heroPublicId: r.hero_public_id ?? undefined,
    standfirst: r.standfirst ?? undefined,
    body: (r.body ?? []) as ArticleBlock[],
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    timezone: r.timezone ?? undefined,
    currency: r.currency ?? undefined,
    unitSystem: r.unit_system ?? undefined,
    alsoAppearsIn: r.also_appears_in ?? [],
    facts: r.facts ?? [],
    seoTitle: r.seo_title ?? undefined,
    seoDescription: r.seo_description ?? undefined,
    sortPriority: r.sort_priority ?? 0,
    updatedAt: r.updated_at ?? new Date(0).toISOString(),
  };
}

function seedNode(
  id: string, slug: string, name: string, type: GeoType, parentId: string | null,
  extra: Partial<GeoNode> = {},
): GeoNode {
  return {
    id, slug, name, type, parentId, status: "published",
    body: [], alsoAppearsIn: [], facts: [], sortPriority: 0,
    updatedAt: "2026-07-27T00:00:00Z", ...extra,
  };
}

/** Minimal tree so the app renders before the geo rows are seeded. */
export const SEED_GEO: GeoNode[] = [
  seedNode("geo-canada", "canada", "Canada", "country", null, {
    timezone: "America/Vancouver", currency: "CAD", unitSystem: "metric",
  }),
  seedNode("geo-bc", "bc", "British Columbia", "province", "geo-canada"),
  seedNode("geo-ab", "ab", "Alberta", "province", "geo-canada", { sortPriority: 10 }),
  seedNode("geo-on", "on", "Ontario", "province", "geo-canada", { sortPriority: 20 }),
  seedNode("geo-qc", "qc", "Quebec", "province", "geo-canada", { sortPriority: 30 }),
  seedNode("geo-vancouver-island", "vancouver-island", "Vancouver Island", "region", "geo-bc"),
  seedNode("geo-tofino", "tofino", "Tofino", "town", "geo-vancouver-island", { sortPriority: 10 }),
  seedNode("geo-ucluelet", "ucluelet", "Ucluelet", "town", "geo-vancouver-island", { sortPriority: 20 }),
  seedNode("geo-edmonton", "edmonton", "Edmonton", "town", "geo-ab"),
  seedNode("geo-montreal", "montreal", "Montreal", "town", "geo-qc"),
  seedNode("geo-toronto", "toronto", "Toronto", "town", "geo-on"),
];

const RENDERABLE = ["published", "coming_soon"];

function seedLookup(slug: string, parentId: string | null): GeoNode | null {
  return SEED_GEO.find((n) => n.slug === slug && n.parentId === parentId) ?? null;
}

export async function lookupGeoChild(slug: string, parentId: string | null): Promise<GeoNode | null> {
  const sb = getServerSupabase();
  if (sb) {
    let q = sb.from("geo_places").select("*").eq("slug", slug).in("status", RENDERABLE).limit(1);
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    const { data, error } = await q;
    // Only trust an empty result when the table actually exists. If the
    // migration is unapplied the query errors, and we fall through to seed.
    if (!error) return data?.length ? rowToNode(data[0]) : null;
  }
  return seedLookup(slug, parentId);
}

export async function getGeoChildren(parentId: string | null, type?: GeoType): Promise<GeoNode[]> {
  const sb = getServerSupabase();
  if (sb) {
    let q = sb.from("geo_places").select("*").in("status", RENDERABLE);
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    if (type) q = q.eq("type", type);
    const { data, error } = await q.order("sort_priority").order("name");
    if (!error && data) return data.map(rowToNode);
  }
  return SEED_GEO
    .filter((n) => n.parentId === parentId && (!type || n.type === type))
    .sort((a, b) => a.sortPriority - b.sortPriority || a.name.localeCompare(b.name));
}

export async function getGeoNodeById(id: string): Promise<GeoNode | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb.from("geo_places").select("*").eq("id", id).limit(1);
    if (!error) return data?.length ? rowToNode(data[0]) : null;
  }
  return SEED_GEO.find((n) => n.id === id) ?? null;
}

/** Root-first ancestor chain, used for breadcrumbs and canonical URLs. */
export async function getTrailFor(id: string): Promise<GeoNode[]> {
  const trail: GeoNode[] = [];
  let cursor: string | null = id;
  while (cursor && trail.length < 8) {
    const node: GeoNode | null = await getGeoNodeById(cursor);
    if (!node) break;
    trail.unshift(node);
    cursor = node.parentId;
  }
  return trail;
}

/** Canonical destination path for a town slug. Used by landing-page links. */
export async function pathForTownSlug(slug: string): Promise<string> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("geo_places").select("id").eq("slug", slug).eq("type", "town").in("status", RENDERABLE).limit(1);
    if (!error && data?.length) return geoPath(await getTrailFor(data[0].id));
  }
  const seed = SEED_GEO.find((n) => n.slug === slug && n.type === "town");
  if (!seed) return "/destinations";
  const trail: GeoNode[] = [];
  let cursor: string | null = seed.id;
  while (cursor) {
    const node: GeoNode | undefined = SEED_GEO.find((n) => n.id === cursor);
    if (!node) break;
    trail.unshift(node);
    cursor = node.parentId;
  }
  return geoPath(trail);
}

export type DestinationCategory = {
  geoPlaceId: string;
  categorySlug: string;
  status: "active" | "coming_soon" | "hidden";
  overviewBody: ArticleBlock[];
  bestMonths: number[];
  heroPublicId?: string;
  sortOrder: number;
  updatedAt: string;
};

export async function getDestinationCategories(geoPlaceId: string): Promise<DestinationCategory[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("destination_categories")
    .select("*")
    .eq("geo_place_id", geoPlaceId)
    .in("status", ["active", "coming_soon"])
    .order("sort_order");
  if (error || !data) return [];
  return data.map((r: any) => ({
    geoPlaceId: r.geo_place_id,
    categorySlug: r.category_slug,
    status: r.status,
    overviewBody: (r.overview_body ?? []) as ArticleBlock[],
    bestMonths: r.best_months ?? [],
    heroPublicId: r.hero_public_id ?? undefined,
    sortOrder: r.sort_order ?? 0,
    updatedAt: r.updated_at ?? new Date(0).toISOString(),
  }));
}

/* ── Status cascade (spec 3.7) ──────────────────────────────────────────── */

/**
 * Hiding or archiving an ancestor makes its descendants unreachable for
 * rendering only. Stored status is never mutated, so re-publishing the
 * ancestor restores the prior state exactly (AC 13).
 */
const STATUS_SEVERITY: Record<GeoStatus, number> = {
  published: 0, coming_soon: 1, draft: 2, hidden: 3, archived: 4,
};

export function effectiveStatus(trail: GeoNode[]): GeoStatus {
  return trail.reduce<GeoStatus>(
    (worst, node) => (STATUS_SEVERITY[node.status] > STATUS_SEVERITY[worst] ? node.status : worst),
    "published",
  );
}

export function isTrailRenderable(trail: GeoNode[]): boolean {
  return isRenderable(effectiveStatus(trail));
}

/* ── Index and sitemap reads ────────────────────────────────────────────── */

export type GeoChildLink = { node: GeoNode; path: string; townCount: number };

/**
 * Children of the trail's last node with their canonical paths.
 *
 * `townCount` counts only towns that actually render. A town exists in the
 * geo tree the moment it is seeded, but it 404s until it has content, so
 * counting raw children would make an index page emit links to its own 404s
 * and would render an empty province as a real page.
 */
export async function getGeoChildLinks(trail: GeoNode[]): Promise<GeoChildLink[]> {
  const parent = trail[trail.length - 1];
  const [children, navigable] = await Promise.all([
    getGeoChildren(parent.id),
    getNavigableSlugs().then((slugs) => new Set(slugs)),
  ]);

  return Promise.all(
    children.map(async (node) => {
      const path = geoPath([...trail, node]);
      if (node.type === "town") {
        return { node, path, townCount: navigable.has(node.slug) ? 1 : 0 };
      }
      if (node.type === "area") return { node, path, townCount: 1 };

      const [towns, regions] = await Promise.all([
        getGeoChildren(node.id, "town"),
        getGeoChildren(node.id, "region"),
      ]);
      const nested = await Promise.all(regions.map((r) => getGeoChildren(r.id, "town")));
      const all = [...towns, ...nested.flat()];
      return { node, path, townCount: all.filter((t) => navigable.has(t.slug)).length };
    }),
  );
}

/** Every renderable node, root-first, paired with its trail. Drives sitemaps. */
export async function getAllGeoTrails(): Promise<GeoNode[][]> {
  const roots = await getGeoChildren(null);
  const out: GeoNode[][] = [];
  async function walk(trail: GeoNode[]) {
    if (!isTrailRenderable(trail)) return;
    out.push(trail);
    const children = await getGeoChildren(trail[trail.length - 1].id);
    for (const child of children) await walk([...trail, child]);
  }
  for (const root of roots) await walk([root]);
  return out;
}

/**
 * Every navigable town beneath a node, flattened with its canonical path.
 *
 * A province holding one region rendered as a single lonely card. Surfacing
 * the towns underneath fills the page with something useful and removes a
 * click, rather than making the guest drill through a tier that holds one item.
 */
export async function getTownsBeneath(trail: GeoNode[]): Promise<{ node: GeoNode; path: string }[]> {
  const navigable = new Set(await getNavigableSlugs());
  const out: { node: GeoNode; path: string }[] = [];

  async function walk(t: GeoNode[]) {
    const children = await getGeoChildren(t[t.length - 1].id);
    for (const child of children) {
      if (child.type === "town") {
        if (navigable.has(child.slug)) out.push({ node: child, path: geoPath([...t, child]) });
      } else if (child.type !== "area") {
        await walk([...t, child]);
      }
    }
  }
  await walk(trail);
  return out;
}
