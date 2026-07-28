/**
 * Editors typed the CMS fields into the top of each document, so guide leads
 * were rendering as "Meta Description:Discover the best hikes in Squamish".
 * The PRD wants the meta description as a typed field rather than body copy,
 * so this lifts the value into destination_categories.seo_description and
 * removes the line from the body. Idempotent.
 *
 * Run: node --env-file=.env.local scripts/repair-cms-fields.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readCmsField } from "./lib/clean.mjs";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const strip = (blocks) => {
  const meta = {};
  const kept = [];
  for (const b of blocks || []) {
    const f = b?.text ? readCmsField(b.text) : null;
    if (f) { if (f.value) meta[f.field] = f.value; continue; }
    kept.push(b);
  }
  return { kept, meta, removed: (blocks || []).length - kept.length };
};

let ccFixed = 0, ccMeta = 0, geoFixed = 0, artFixed = 0;

const { data: towns } = await sb.from("geo_places").select("id,slug").eq("type", "town");
const townId = Object.fromEntries((towns || []).map((t) => [t.slug, t.id]));

const { data: cc, error: ccErr } = await sb.from("city_categories").select("city_slug,category_slug,intro");
if (ccErr) throw new Error(ccErr.message);
for (const r of cc || []) {
  const { kept, meta, removed } = strip(r.intro);
  if (!removed) continue;
  await sb.from("city_categories").update({ intro: kept })
    .eq("city_slug", r.city_slug).eq("category_slug", r.category_slug);
  ccFixed += removed;
  const desc = meta["meta-description"];
  const gid = townId[r.city_slug];
  if (desc && gid) {
    const { error } = await sb.from("destination_categories")
      .update({ seo_description: desc.slice(0, 320) })
      .eq("geo_place_id", gid).eq("category_slug", r.category_slug);
    if (!error) ccMeta++;
  }
}

const { data: geo } = await sb.from("geo_places").select("id,body").eq("type", "town");
for (const r of geo || []) {
  const { kept, meta, removed } = strip(r.body);
  if (!removed) continue;
  const patch = { body: kept };
  if (meta["meta-description"]) patch.seo_description = meta["meta-description"].slice(0, 320);
  await sb.from("geo_places").update(patch).eq("id", r.id);
  geoFixed += removed;
}

const { data: arts } = await sb.from("articles").select("slug,body,seo_description");
for (const r of arts || []) {
  const { kept, meta, removed } = strip(r.body);
  if (!removed) continue;
  const patch = { body: kept };
  if (meta["meta-description"] && !r.seo_description) patch.seo_description = meta["meta-description"].slice(0, 320);
  await sb.from("articles").update(patch).eq("slug", r.slug);
  artFixed += removed;
}

console.log(`removed ${ccFixed} CMS lines from guide bodies, ${geoFixed} from town bodies, ${artFixed} from articles`);
console.log(`lifted ${ccMeta} meta descriptions into destination_categories.seo_description`);
