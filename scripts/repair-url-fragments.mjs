/**
 * Word splits hyperlinks across text runs, so some paragraphs reached the
 * database as a shorn URL: "ttps://www.istockphoto.com/photo/...". Those
 * rendered as body copy. clean.mjs now catches the truncated form at ingest;
 * this repairs the rows already written. Idempotent.
 *
 * Run: node --env-file=.env.local scripts/repair-url-fragments.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { splitUrls } from "./lib/clean.mjs";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Keep a block only if real copy survives once its URLs are removed. */
function scrub(blocks) {
  let changed = 0;
  const kept = [];
  for (const b of blocks || []) {
    if (!b?.text) { kept.push(b); continue; }
    const { text, urls } = splitUrls(b.text);
    if (!urls.length) { kept.push(b); continue; }
    changed++;
    if (text.length > 2) kept.push({ ...b, text });
  }
  return { kept, changed };
}

const targets = [
  ["city_categories", "intro", "city_slug,category_slug"],
  ["geo_places", "body", "id"],
  ["articles", "body", "slug"],
  ["places", "body", "id"],
];

let total = 0;
for (const [table, col, keys] of targets) {
  const { data, error } = await sb.from(table).select(`${keys},${col}`);
  if (error) throw new Error(`${table}: ${error.message}`);
  for (const row of data || []) {
    const { kept, changed } = scrub(row[col]);
    if (!changed) continue;
    let q = sb.from(table).update({ [col]: kept });
    for (const k of keys.split(",")) q = q.eq(k, row[k]);
    const { error: e } = await q;
    if (e) throw new Error(`${table} update: ${e.message}`);
    total += changed;
  }
  console.log(`${table}.${col} scrubbed`);
}
console.log(`${total} blocks carried a URL; each stripped, empty ones removed`);
