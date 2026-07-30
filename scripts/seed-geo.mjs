/**
 * Builds the geographic tree from the existing `destinations` rows.
 * Idempotent: upserts by (parent, slug) and never deletes.
 *
 * Prereq: apply supabase/migrations/0003_geo_tree.sql.
 * Run: npm run seed:geo
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Which province and region each known city belongs to. Read from the corpus,
 * never guessed. Cities absent here are skipped and reported, so a new city
 * fails loudly rather than landing under the wrong province.
 */
const CITY_GEO = {
  // Vancouver Island
  tofino:           { province: "bc", region: "vancouver-island" },
  ucluelet:         { province: "bc", region: "vancouver-island" },
  victoria:         { province: "bc", region: "vancouver-island" },
  nanaimo:          { province: "bc", region: "vancouver-island" },
  sooke:            { province: "bc", region: "vancouver-island" },
  sidney:           { province: "bc", region: "vancouver-island" },
  chemainus:        { province: "bc", region: "vancouver-island" },
  "shawnigan-lake": { province: "bc", region: "vancouver-island" },
  "nanoose-bay":    { province: "bc", region: "vancouver-island" },
  parksville:       { province: "bc", region: "vancouver-island" },
  "campbell-river": { province: "bc", region: "vancouver-island" },
  // Sea to Sky corridor
  squamish:         { province: "bc", region: "sea-to-sky" },
  whistler:         { province: "bc", region: "sea-to-sky" },
  // Rest of British Columbia: no region node, the province is the parent.
  vancouver:        { province: "bc", region: null },
  nelson:           { province: "bc", region: null },
  // Alberta
  banff:            { province: "ab", region: null },
  jasper:           { province: "ab", region: null },
  edmonton:         { province: "ab", region: null },
  // Ontario
  ottawa:           { province: "on", region: null },
  "niagara-falls":  { province: "on", region: null },
  toronto:          { province: "on", region: null },
  // Quebec
  montreal:         { province: "qc", region: null },
  "quebec-city":    { province: "qc", region: null },
  // Atlantic and prairie
  halifax:          { province: "ns", region: null },
  "st-johns":       { province: "nl", region: null },
  charlottetown:    { province: "pe", region: null },
  saskatoon:        { province: "sk", region: null },
};

const PROVINCES = {
  bc: "British Columbia",
  ab: "Alberta",
  on: "Ontario",
  qc: "Quebec",
  ns: "Nova Scotia",
  nl: "Newfoundland and Labrador",
  pe: "Prince Edward Island",
  sk: "Saskatchewan",
};

const REGIONS = {
  "vancouver-island": { name: "Vancouver Island", province: "bc" },
  "sea-to-sky":       { name: "Sea to Sky",       province: "bc" },
};

async function upsert(row) {
  const base = sb.from("geo_places").select("id").eq("slug", row.slug);
  const q = row.parent_id === null ? base.is("parent_id", null) : base.eq("parent_id", row.parent_id);
  const { data: found, error: findError } = await q.limit(1);
  if (findError) throw new Error(`lookup ${row.slug}: ${findError.message}`);

  if (found?.length) {
    const { error } = await sb
      .from("geo_places")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", found[0].id);
    if (error) throw new Error(`update ${row.slug}: ${error.message}`);
    return found[0].id;
  }

  const { data, error } = await sb.from("geo_places").insert(row).select("id").single();
  if (error) throw new Error(`insert ${row.slug}: ${error.message}`);
  return data.id;
}

/**
 * Provinces are roots. Canada was the root until 2026-07-30 and left the tree
 * with the rest of the country segment (docs/qa/bc-root-contract.md), so the
 * locale fields it carried for its descendants now sit on each province.
 *
 * Any historical `canada` row is archived rather than deleted: parent_id
 * cascades on delete, so dropping it before the provinces are reparented would
 * take the whole tree with it.
 */
const TIMEZONE = {
  bc: "America/Vancouver", ab: "America/Edmonton", sk: "America/Regina",
  on: "America/Toronto", qc: "America/Toronto", ns: "America/Halifax",
  pe: "America/Halifax", nl: "America/St_Johns",
};

/* Lift any province still hanging off a country to the root BEFORE upserting,
   or the upsert (which matches on parent and slug) would insert a second `bc`
   beside the old one instead of finding it. */
const { data: countries, error: countryError } = await sb
  .from("geo_places").select("id").eq("type", "country");
if (countryError) throw new Error(`read country rows: ${countryError.message}`);
const countryIds = (countries ?? []).map((c) => c.id);
if (countryIds.length) {
  const { error } = await sb
    .from("geo_places").update({ parent_id: null, updated_at: new Date().toISOString() })
    .in("parent_id", countryIds);
  if (error) throw new Error(`lift provinces to the root: ${error.message}`);
}

const provinceIds = {};
let order = 0;
for (const [slug, name] of Object.entries(PROVINCES)) {
  provinceIds[slug] = await upsert({
    slug, name, type: "province", parent_id: null, status: "published", sort_priority: (order += 10),
    timezone: TIMEZONE[slug], currency: "CAD", unit_system: "metric",
  });
}

if (countryIds.length) {
  const { error } = await sb
    .from("geo_places").update({ status: "archived", updated_at: new Date().toISOString() })
    .in("id", countryIds);
  if (error) throw new Error(`archive country rows: ${error.message}`);
}

const regionIds = {};
for (const [slug, region] of Object.entries(REGIONS)) {
  regionIds[slug] = await upsert({
    slug, name: region.name, type: "region", parent_id: provinceIds[region.province], status: "published",
  });
}

const { data: cities, error: cityError } = await sb.from("destinations").select("*").order("slug");
if (cityError) throw new Error(`read destinations: ${cityError.message}`);

let linked = 0;
const skipped = [];
for (const city of cities ?? []) {
  const geo = CITY_GEO[city.slug];
  if (!geo) {
    skipped.push(city.slug);
    continue;
  }
  const parent = geo.region ? regionIds[geo.region] : provinceIds[geo.province];
  const id = await upsert({
    slug: city.slug,
    name: city.name,
    type: "town",
    parent_id: parent,
    status: city.published ? "published" : "draft",
    standfirst: city.standfirst ?? null,
    hero_public_id: city.hero_public_id ?? null,
    sort_priority: city.sort_order ?? 0,
  });
  const { error } = await sb.from("destinations").update({ geo_place_id: id }).eq("slug", city.slug);
  if (error) throw new Error(`link ${city.slug}: ${error.message}`);
  linked++;
}

console.log(
  `geo tree: ${Object.keys(provinceIds).length} provinces at the root, ` +
  `${Object.keys(regionIds).length} regions, ${linked} towns linked`,
);
if (skipped.length) console.log(`skipped, no province mapping: ${skipped.join(", ")}`);
