/**
 * Sitemap sources. Generated from the database on request, never at build
 * time, so lastmod is the owning entity's updated_at rather than the moment
 * of deploy (AC 34). Request-time generation with a short revalidation window
 * also means no status transition can be missed, because there is no trigger
 * to wire (spec section 6).
 *
 * Everything here reads in BULK. The first version walked the geo tree and
 * issued a query per node, then another per town for its guides and another
 * for its categories. That was fine at two towns and timed out the build at
 * twenty-seven: Next gives a route sixty seconds and the walk needed more.
 * Five queries now serve the whole file, and the tree is assembled in memory.
 */
import { getServerSupabase } from "./supabase";
import { geoPath, guidePath, isRenderable, type GeoNode, type GeoStatus, type GeoType } from "./geo-types";

export const SITE = "https://arctrips.com";

/** Google's per-file limit is 50,000; split below it so a spike cannot breach it. */
export const SITEMAP_MAX_URLS = 45_000;

export type SitemapEntry = { url: string; lastmod: string };

type Row = {
  id: string; slug: string; name: string; type: GeoType;
  parent_id: string | null; status: GeoStatus; updated_at: string | null;
};

function iso(value: string | null | undefined): string {
  const d = value ? new Date(value) : new Date(0);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

export function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Path for a node, built by walking parents in memory rather than querying. */
function pathFor(id: string, byId: Map<string, Row>): GeoNode[] {
  const trail: Row[] = [];
  let cursor: string | null = id;
  while (cursor && trail.length < 8) {
    const node: Row | undefined = byId.get(cursor);
    if (!node) break;
    trail.unshift(node);
    cursor = node.parent_id;
  }
  return trail.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, type: r.type, parentId: r.parent_id,
    status: r.status, body: [], alsoAppearsIn: [], facts: [], sortPriority: 0,
    updatedAt: r.updated_at ?? "",
  }));
}

/**
 * Every renderable destination URL. A town with no content 404s, so it is
 * excluded along with its things-to-do index; listing it would put a soft 404
 * in front of a crawler.
 */
export async function destinationEntries(): Promise<SitemapEntry[]> {
  const sb = getServerSupabase();
  const entries: SitemapEntry[] = [{ url: `${SITE}/destinations`, lastmod: new Date().toISOString() }];
  if (!sb) return entries;

  const [geo, cats, guides, dests] = await Promise.all([
    sb.from("geo_places").select("id,slug,name,type,parent_id,status,updated_at"),
    sb.from("destination_categories").select("geo_place_id,category_slug,status,updated_at"),
    sb.from("city_categories").select("city_slug,category_slug").eq("published", true),
    sb.from("destinations").select("slug,standfirst").eq("published", true),
  ]);
  if (geo.error || !geo.data) return entries;

  const rows = (geo.data as Row[]).filter((r) => isRenderable(r.status));
  const byId = new Map(rows.map((r) => [r.id, r]));

  // A town renders only when getCity would return it, which needs a standfirst.
  const navigable = new Set(
    (dests.data ?? []).filter((d: { standfirst: string | null }) => d.standfirst).map((d: { slug: string }) => d.slug),
  );
  const guidesByCity = new Map<string, string[]>();
  for (const g of (guides.data ?? []) as { city_slug: string; category_slug: string }[]) {
    guidesByCity.set(g.city_slug, [...(guidesByCity.get(g.city_slug) ?? []), g.category_slug]);
  }
  const catUpdated = new Map<string, string>();
  for (const c of (cats.data ?? []) as { geo_place_id: string; category_slug: string; status: string; updated_at: string }[]) {
    if (c.status === "hidden") continue;
    catUpdated.set(`${c.geo_place_id}:${c.category_slug}`, c.updated_at);
  }

  // An ancestor is listed only when a navigable town sits beneath it, which is
  // exactly what GeoIndex renders. Computed once by walking upward from towns.
  const ancestorHasTown = new Set<string>();
  for (const r of rows) {
    if (r.type !== "town" || !navigable.has(r.slug)) continue;
    let cursor = r.parent_id;
    while (cursor) { ancestorHasTown.add(cursor); cursor = byId.get(cursor)?.parent_id ?? null; }
  }

  for (const r of rows) {
    const trail = pathFor(r.id, byId);
    if (!trail.length || !trail.every((n) => isRenderable(n.status))) continue;
    const path = geoPath(trail);

    if (r.type === "town") {
      if (!navigable.has(r.slug)) continue;
      entries.push({ url: `${SITE}${path}`, lastmod: iso(r.updated_at) });
      const cs = guidesByCity.get(r.slug) ?? [];
      if (cs.length) entries.push({ url: `${SITE}${path}/things-to-do`, lastmod: iso(r.updated_at) });
      for (const cat of cs) {
        entries.push({
          url: `${SITE}${path}/things-to-do/${cat}`,
          lastmod: iso(catUpdated.get(`${r.id}:${cat}`) ?? r.updated_at),
        });
      }
      continue;
    }
    if (r.type === "area") { entries.push({ url: `${SITE}${path}`, lastmod: iso(r.updated_at) }); continue; }
    if (ancestorHasTown.has(r.id)) entries.push({ url: `${SITE}${path}`, lastmod: iso(r.updated_at) });
  }

  return entries;
}

/** Every guide at its one canonical URL, per guideBelongsToScope. */
export async function guideEntries(): Promise<SitemapEntry[]> {
  const sb = getServerSupabase();
  if (!sb) return [];

  const [geo, arts] = await Promise.all([
    sb.from("geo_places").select("id,slug,name,type,parent_id,status,updated_at"),
    sb.from("articles").select("slug,destination_slug,region_slug,updated_at,body").eq("published", true),
  ]);
  if (geo.error || arts.error || !geo.data || !arts.data) return [];

  const rows = (geo.data as Row[]).filter((r) => isRenderable(r.status));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const townById = new Map(rows.filter((r) => r.type === "town").map((r) => [r.slug, r.id]));

  // Regional roundups terminate above town, which is amendment A12 and the
  // whole reason 11 of them have a legal URL at all. Keying only on
  // destination_slug dropped every one of them from the sitemap.
  const regionById = new Map(
    rows.filter((r) => r.type === "region" || r.type === "province").map((r) => [r.slug, r.id]),
  );

  const entries: SitemapEntry[] = [];
  for (const a of arts.data as {
    slug: string; destination_slug: string | null; region_slug: string | null;
    updated_at: string | null; body: unknown[];
  }[]) {
    // A slug with no body is a FAQ carrier, not a page.
    if (a.slug.endsWith("-faq") || !(a.body?.length)) continue;
    const scopeId = a.destination_slug
      ? townById.get(a.destination_slug)
      : a.region_slug
        ? regionById.get(a.region_slug)
        : undefined;
    if (!scopeId) continue;
    const trail = pathFor(scopeId, byId);
    if (!trail.length) continue;
    entries.push({ url: `${SITE}${guidePath(trail, a.slug)}`, lastmod: iso(a.updated_at) });
  }
  return entries;
}
