/**
 * Populates `destination_categories` from the existing `city_categories` rows,
 * so the applicability model is load-bearing rather than an empty table.
 *
 * A category page exists if and only if a row is here (AC 5, 9, 12). Status is
 * `active` where the guide has a real body and `coming_soon` otherwise: the
 * table's check constraint rejects `active` with an empty overview_body, which
 * is the constraint doing its job rather than a problem to work around.
 *
 * Idempotent: upserts on (geo_place_id, category_slug), never deletes.
 * Run: npm run backfill:categories
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** A single intro block is a stub, not a guide. Matches the grid's own rule. */
const REAL_BODY_BLOCKS = 2;

const { data: towns, error: townError } = await sb
  .from("geo_places").select("id,slug").eq("type", "town");
if (townError) throw new Error(`read towns: ${townError.message}`);
const townId = Object.fromEntries((towns ?? []).map((t) => [t.slug, t.id]));

const { data: rows, error: rowError } = await sb
  .from("city_categories").select("city_slug,category_slug,intro,hero_public_id,sort_order,published");
if (rowError) throw new Error(`read city_categories: ${rowError.message}`);

let active = 0, soon = 0;
const skipped = [];

for (const row of rows ?? []) {
  const geoPlaceId = townId[row.city_slug];
  if (!geoPlaceId) { skipped.push(`${row.city_slug} (no geo node)`); continue; }

  const intro = Array.isArray(row.intro) ? row.intro : [];
  const status = intro.length >= REAL_BODY_BLOCKS ? "active" : "coming_soon";
  if (status === "active") active++; else soon++;

  const { error } = await sb.from("destination_categories").upsert({
    geo_place_id: geoPlaceId,
    category_slug: row.category_slug,
    status,
    overview_body: intro,
    hero_public_id: row.hero_public_id ?? null,
    sort_order: row.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: "geo_place_id,category_slug" });

  if (error) throw new Error(`upsert ${row.city_slug}/${row.category_slug}: ${error.message}`);
}

console.log(`destination_categories: ${active} active, ${soon} coming_soon`);
if (skipped.length) console.log(`skipped: ${skipped.join(", ")}`);
