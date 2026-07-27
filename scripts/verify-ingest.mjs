/**
 * Reports what is actually in the database after a corpus ingest.
 *
 * Counts only. It asserts nothing and changes nothing: the point is to put
 * the real numbers next to the 73-document map so a missed document is
 * visible rather than assumed absent.
 *
 * Run: node --env-file=.env.local scripts/verify-ingest.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function count(table, filter = "") {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*&limit=1${filter ? `&${filter}` : ""}`,
    { headers: { ...h, Prefer: "count=exact" } });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return Number((res.headers.get("content-range") ?? "/0").split("/")[1]);
}

/** Pages through the whole table: PostgREST caps a single response at 1,000 rows. */
async function all(table, select, filter = "") {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=${select}${filter ? `&${filter}` : ""}`,
      { headers: { ...h, Range: `${from}-${from + PAGE - 1}` } });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const map = JSON.parse(readFileSync(fileURLToPath(new global.URL("./proposed-map.json", import.meta.url)), "utf8"));

console.log("── row counts ──");
for (const t of ["regions", "destinations", "categories", "city_categories", "places", "photos", "articles", "experiences", "geo_places", "destination_categories"]) {
  console.log(`${t.padEnd(24)} ${await count(t)}`);
}

const geo = await all("geo_places", "slug,type,status,body");
const byType = geo.reduce((a, g) => ({ ...a, [g.type]: (a[g.type] ?? 0) + 1 }), {});
console.log("\n── geo_places by type ──");
console.log(byType);
const townsWithBody = geo.filter((g) => g.type === "town" && (g.body?.length ?? 0) > 0);
console.log(`towns with an ingested body: ${townsWithBody.length}`);

console.log("\n── coverage against the 73-document map ──");
const expectedHubCities = new Set(map.filter((e) => e.kind === "hub" || e.kind === "hub-whole").map((e) => e.city));
const missingHubBody = [...expectedHubCities].filter((c) => !townsWithBody.some((t) => t.slug === c));
console.log(`hub cities expected ${expectedHubCities.size}, with body ${expectedHubCities.size - missingHubBody.length}`);
if (missingHubBody.length) console.log(`  MISSING: ${missingHubBody.join(", ")}`);

const expectedCats = new Set(map.filter((e) => e.kind === "category").map((e) => `${e.city}/${e.cat}`));
const cityCats = await all("city_categories", "city_slug,category_slug,intro");
const withIntro = cityCats.filter((c) => (c.intro?.length ?? 0) > 0).map((c) => `${c.city_slug}/${c.category_slug}`);
const missingCats = [...expectedCats].filter((k) => !withIntro.includes(k));
console.log(`category pages expected ${expectedCats.size}, with an ingested intro ${expectedCats.size - missingCats.length}`);
if (missingCats.length) console.log(`  MISSING: ${missingCats.join(", ")}`);

const articles = await all("articles", "slug,region_slug,body,faqs");
const withBody = articles.filter((a) => (a.body?.length ?? 0) > 0);
console.log(`articles ${articles.length}, with a body ${withBody.length}, region-scoped ${articles.filter((a) => a.region_slug).length}`);

console.log("\n── content quality ──");
const places = await all("places", "slug,city_slug,category_slug,name,blurb,body,good_for,hero_public_id");
const photos = await all("photos", "public_id,city_slug,category_slug,place_slug,source_url");
const bad = {
  emDash: places.filter((p) => /[—–]/.test(JSON.stringify(p))).length,
  urlInCopy: places.filter((p) => /https?:\/\//.test(p.name + p.blurb + JSON.stringify(p.body))).length,
  emptyBlurb: places.filter((p) => !p.blurb).length,
  noHero: places.filter((p) => !p.hero_public_id).length,
  sentenceName: places.filter((p) => p.name.length > 90).length,
  blurbRepeatedInBody: places.filter((p) => (p.body ?? []).some((b) => b.type === "p" && b.text === p.blurb)).length,
  goodForHeaderJunk: places.filter((p) => (p.good_for ?? []).some((g) => /^(location|best for|beach)$/i.test(g.trim()))).length,
};
console.log(bad);
console.log(`places by city: ${JSON.stringify(places.reduce((a, p) => ({ ...a, [p.city_slug]: (a[p.city_slug] ?? 0) + 1 }), {}))}`);
console.log(`photos with a source_url: ${photos.filter((p) => p.source_url).length}/${photos.length}`);
console.log(`photos tagged to a place: ${photos.filter((p) => p.place_slug).length}`);
