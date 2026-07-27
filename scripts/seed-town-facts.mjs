/**
 * Key facts and coordinates for the launch towns (PRD 6.2 orientation).
 *
 * These are editor-authored factual claims, not derived data. Drive times and
 * airport proximity go stale and OQ-10 has no source-of-truth process yet, so
 * they live in one reviewable place and the strip renders only what is set.
 * Anything not listed here simply does not render, rather than being guessed.
 *
 * Run: npm run seed:facts
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TOWNS = {
  tofino: {
    lat: 49.1530, lng: -125.9066,
    facts: [
      { k: "Nearest airport", v: "Tofino/Long Beach (YAZ)" },
      { k: "Drive from Nanaimo", v: "About 3 hours" },
      { k: "Drive from Victoria", v: "About 4 hours 30" },
      { k: "Typical stay", v: "3 to 4 nights" },
    ],
  },
  ucluelet: {
    lat: 48.9412, lng: -125.5463,
    facts: [
      { k: "Nearest airport", v: "Tofino/Long Beach (YAZ)" },
      { k: "Drive from Nanaimo", v: "About 2 hours 45" },
      { k: "Drive from Victoria", v: "About 4 hours 15" },
      { k: "Typical stay", v: "2 to 3 nights" },
    ],
  },
};

let updated = 0;
for (const [slug, data] of Object.entries(TOWNS)) {
  const { error } = await sb
    .from("geo_places")
    .update({ lat: data.lat, lng: data.lng, facts: data.facts, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .eq("type", "town");
  if (error) throw new Error(`update ${slug}: ${error.message}`);
  updated++;
}

// Per-town best_months, so the season module and seasonal ordering are real
// rather than falling back to the global category default.
const CATEGORY_BEST_MONTHS = JSON.parse(
  await readFile(new URL("../app/lib/best-months.json", import.meta.url), "utf8"),
);
const { data: rows, error: readError } = await sb
  .from("destination_categories").select("geo_place_id,category_slug");
if (readError) throw new Error(`read categories: ${readError.message}`);

let months = 0;
for (const row of rows ?? []) {
  const best = CATEGORY_BEST_MONTHS[row.category_slug];
  if (!best) continue;
  const { error } = await sb
    .from("destination_categories")
    .update({ best_months: best })
    .eq("geo_place_id", row.geo_place_id)
    .eq("category_slug", row.category_slug);
  if (error) throw new Error(`months ${row.category_slug}: ${error.message}`);
  months++;
}

console.log(`facts: ${updated} towns, best_months on ${months} categories`);
