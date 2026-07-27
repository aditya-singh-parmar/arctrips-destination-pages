/**
 * Sitemap sources. Generated from the database on request, never at build
 * time, so lastmod is the owning entity's updated_at rather than the moment
 * of deploy (AC 34). Request-time generation with a short revalidation window
 * also means no status transition can be missed, because there is no trigger
 * to wire (spec section 6).
 */
import { getAllGeoTrails, getDestinationCategories } from "./geo";
import { geoPath, guidePath, type GeoNode } from "./geo-types";
import { getArticleBySlug, getAllArticleSlugs, getGuidesForCity, getNavigableSlugs } from "./content";

export const SITE = "https://arctrips.com";

/** Google's per-file limit is 50,000; split below it so a spike cannot breach it. */
export const SITEMAP_MAX_URLS = 45_000;

export type SitemapEntry = { url: string; lastmod: string };

function iso(value: string | undefined): string {
  const d = value ? new Date(value) : new Date(0);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

export function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * Every renderable destination URL. A town that has no content 404s, so it is
 * excluded along with its things-to-do and plan indexes; listing it would put
 * a soft 404 in front of a crawler.
 */
export async function destinationEntries(): Promise<SitemapEntry[]> {
  const [trails, navigable] = await Promise.all([
    getAllGeoTrails(),
    getNavigableSlugs().then((s) => new Set(s)),
  ]);

  const entries: SitemapEntry[] = [{ url: `${SITE}/destinations`, lastmod: new Date().toISOString() }];

  for (const trail of trails) {
    const node: GeoNode = trail[trail.length - 1];
    const path = geoPath(trail);

    if (node.type === "town") {
      if (!navigable.has(node.slug)) continue;
      entries.push({ url: `${SITE}${path}`, lastmod: iso(node.updatedAt) });

      const guides = await getGuidesForCity(node.slug);
      if (guides.length) {
        entries.push({ url: `${SITE}${path}/things-to-do`, lastmod: iso(node.updatedAt) });
      }

      // lastmod per category comes from that category's own row, never the
      // town's and never build time.
      const cats = await getDestinationCategories(node.id);
      const byslug = new Map(cats.map((c) => [c.categorySlug, c.updatedAt]));
      for (const g of guides) {
        entries.push({
          url: `${SITE}${path}/things-to-do/${g.categorySlug}`,
          lastmod: iso(byslug.get(g.categorySlug) ?? node.updatedAt),
        });
      }
      continue;
    }

    if (node.type === "area") {
      entries.push({ url: `${SITE}${path}`, lastmod: iso(node.updatedAt) });
      continue;
    }

    // Country, province and region render only when a navigable town sits
    // beneath them, matching what GeoIndex does.
    const hasTown = trails.some(
      (t) => t.length > trail.length &&
        t[trail.length - 1]?.id === node.id &&
        t[t.length - 1].type === "town" &&
        navigable.has(t[t.length - 1].slug),
    );
    if (hasTown) entries.push({ url: `${SITE}${path}`, lastmod: iso(node.updatedAt) });
  }

  return entries;
}

/** Every guide at its one canonical URL, per guideBelongsToScope. */
export async function guideEntries(): Promise<SitemapEntry[]> {
  const [slugs, trails] = await Promise.all([getAllArticleSlugs(), getAllGeoTrails()]);
  const townTrail = new Map<string, GeoNode[]>();
  for (const t of trails) {
    const last = t[t.length - 1];
    if (last.type === "town") townTrail.set(last.slug, t);
  }

  const entries: SitemapEntry[] = [];
  for (const slug of slugs) {
    const article = await getArticleBySlug(slug);
    if (!article) continue;
    const trail = townTrail.get(article.destinationSlug);
    if (!trail) continue;
    entries.push({
      url: `${SITE}${guidePath(trail, slug)}`,
      lastmod: iso((article as { updatedAt?: string }).updatedAt),
    });
  }
  return entries;
}
