/**
 * Decomposer driver for the v1.1 tree (spec section 7).
 *
 * A corpus category doc (e.g. `Tofino - Beaches.docx`) is not an article, it
 * is the category page: H1 is the category, H2s are its sections, and each
 * H3 under a "listing" H2 is a place. This script unzips each mapped .docx,
 * extracts ordered heading/paragraph/image blocks, runs them through
 * `scripts/lib/decompose.mjs`'s pure classifier, uploads place-tagged images
 * to Cloudinary, and writes city_categories / places / photos rows. Docs
 * that are not category-shaped (Whale Festival, Best Time to Stay,
 * Campgrounds, Whale Tails, How to Choose a Vacation Rental, the three extra
 * Ucluelet whale docs) stay whole as `articles` rows instead.
 *
 * Prereq: run `npm run seed` first (creates destinations/categories/
 * city_categories/articles rows). Re-running seed wipes ingested content, so
 * re-run this after.
 * Run: node --env-file=.env.local scripts/ingest-articles.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { classify, slugify } from "./lib/decompose.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "djqswlfat";
const CK = process.env.CLOUDINARY_API_KEY;
const CS = process.env.CLOUDINARY_API_SECRET;
if (!URL || !KEY || !CK || !CS) { console.error("Missing Supabase / Cloudinary env."); process.exit(1); }

const CORPUS = fileURLToPath(new global.URL("../New Articles - 2026/", import.meta.url));
const MAX_IMAGES_PER_DOC = 40;

/* ── Per-doc configuration ────────────────────────────────────────────────
   v1.1 scope is Tofino and Ucluelet only (spec section 1). placeHeadings is
   the explicit per-doc whitelist of H2 texts whose H3 children become
   places; every entry below was verified against the doc's real heading
   list (see docs/superpowers/plans/2026-07-24-destination-pages-v1.1.md
   "known risk"). An empty placeHeadings array is a legitimate outcome: the
   doc's H3s are species/tour-types/seasons rather than places, so its whole
   body becomes the category's intro instead. */
const DOC_MAP = [
  { file: "Tofino - Beaches.docx", citySlug: "tofino", categorySlug: "beaches",
    placeHeadings: ["Best Beaches in and Around Tofino", "Beaches Near Tofino in Pacific Rim National Park"] },
  { file: "Tofino - Surfing.docx", citySlug: "tofino", categorySlug: "surfing",
    placeHeadings: [] }, // beach names are bolded inline text, not H3s; whole doc becomes intro
  { file: "Tofino - Kayaking.docx", citySlug: "tofino", categorySlug: "kayaking",
    placeHeadings: [
      "Easy Kayaking Spots for Beginners", "Easy to Moderate Kayaking Spots",
      "Moderate to Advanced Kayaking Spots", "Advanced and Expedition Kayaking Spots",
      "Other Kayaking Areas Worth Knowing",
    ] },
  { file: "Tofino - Wildlife tours.docx", citySlug: "tofino", categorySlug: "whale-watching",
    placeHeadings: [] }, // H3s are whale/animal species and tour types, not places
  { file: "Tofino - Seabirds.docx", citySlug: "tofino", categorySlug: "birding",
    placeHeadings: [] }, // H3s are bird species, not places
  { file: "Tofino - Storm Watching.docx", citySlug: "tofino", categorySlug: "storm-watching",
    placeHeadings: ["Best Places for Storm Watching in Tofino"] },
  { file: "Tofino - Trails.docx", citySlug: "tofino", categorySlug: "hiking",
    placeHeadings: ["Best Trails in Tofino and Nearby"] },
  { file: "Tofino - Restaurants_.docx", citySlug: "tofino", categorySlug: "restaurants",
    placeHeadings: [
      "Best Restaurants in Tofino", "Best Casual Places to Eat in Tofino",
      "Best Breakfast and Coffee Spots in Tofino", "Best Drinks in Tofino",
    ] },
  // Tofino has no fishing doc (spec section 8): the category ships on
  // experience inventory plus the hand-written intro from scripts/seed.mjs.

  { file: "Ucluelet - Hiking Guide.docx", citySlug: "ucluelet", categorySlug: "hiking",
    placeHeadings: [
      "Is Hiking in Ucluelet Easy?", "Best Nearby Hikes in Pacific Rim National Park",
      "Bigger Nearby Adventures",
    ] },
  { file: "Ucluelet - Kayaking.docx", citySlug: "ucluelet", categorySlug: "kayaking",
    placeHeadings: [
      "Easy Kayaking in Ucluelet", "Easy to Moderate Kayaking Near Ucluelet",
      "Moderate Kayaking Near Ucluelet", "Advanced Kayaking Near Ucluelet",
    ] },
  { file: "Ucluelet - Wildlife watching.docx", citySlug: "ucluelet", categorySlug: "whale-watching",
    placeHeadings: ["Best Wildlife Watching Spots in Ucluelet"] }, // the species/season/tour-type H2s are excluded on purpose
  { file: "Ucluelet - Seabirds.docx", citySlug: "ucluelet", categorySlug: "birding",
    placeHeadings: [] }, // H3s are bird species, not places
  { file: "Ucluelet - Restaurants.docx", citySlug: "ucluelet", categorySlug: "restaurants",
    // "Jiggers Fish and Chips" is mis-styled Heading2 in the source doc (should be H3, a
    // restaurant under "Top Restaurants"); whitelisting it too recovers the ten restaurant
    // H3s that would otherwise fall under it as an unlisted section.
    placeHeadings: [
      "Top Restaurants in Ucluelet", "Jiggers Fish and Chips",
      "Best Coffee, Breakfast, and Bakery Stops in Ucluelet",
    ] },
  // Ucluelet has no fishing doc either: same as Tofino, experiences + hand-written intro.
];

const ARTICLE_MAP = [
  { file: "Pacific Rim Whale Festival Guide.docx", slug: "pacific-rim-whale-festival-guide",
    citySlugs: ["tofino", "ucluelet"], categorySlug: "events" },
  { file: "Best Time to Stay in Ucluelet or Tofino_ Weather, Prices, and What to See.docx",
    slug: "best-time-to-stay-tofino-ucluelet", citySlugs: ["tofino", "ucluelet"], categorySlug: "when-to-go" },
  { file: "Tofino & Ucluelet - Campgrounds.docx", slug: "tofino-ucluelet-campgrounds",
    citySlugs: ["tofino", "ucluelet"], categorySlug: "camping" },
  { file: "Whale Tails, Blows, and Backs_ What You’re Actually Seeing on the Water.docx",
    slug: "whale-tails-blows-and-backs", citySlugs: ["tofino", "ucluelet"], categorySlug: "whale-watching" },
  { file: "How to Choose a Vacation Rental on Vancouver Island.docx", slug: "how-to-choose-a-vacation-rental",
    citySlugs: [], regionSlug: "vancouver-island", categorySlug: "when-to-go" },
  { file: "Whale Watching in Ucluelet.docx", slug: "ucluelet-whale-watching-guide",
    citySlugs: ["ucluelet"], categorySlug: "whale-watching" },
  { file: "Whale Watching Tours in Ucluelet.docx", slug: "ucluelet-whale-watching-tours",
    citySlugs: ["ucluelet"], categorySlug: "whale-watching" },
  { file: "Whales in Ucluelet_ The Spring Migration Explained.docx", slug: "ucluelet-whale-spring-migration",
    citySlugs: ["ucluelet"], categorySlug: "whale-watching" },
];

/* ── docx extraction: word/document.xml -> ordered {style,text,imageRef} blocks ── */

const unescapeXml = (s) => s
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();

function relsMap(xml) {
  const m = {};
  for (const r of xml.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    m[r[1]] = r[2].replace(/^\.\.\//, "").replace(/^\//, "");
  }
  return m;
}

function headingStyle(p) {
  const m = p.match(/w:pStyle[^>]*w:val="(Heading[1-6]|Title|Subtitle)"/);
  if (!m) return null;
  if (m[1] === "Heading1" || m[1] === "Title") return "Heading1";
  if (m[1] === "Heading2" || m[1] === "Subtitle") return "Heading2";
  if (m[1] === "Heading3") return "Heading3";
  return null; // Heading4+ (rare in this corpus): treated as Body
}

/** Unzips one docx and returns ordered classify()-ready blocks, the extracted
 *  excerpt (from a "Meta Description:" label paragraph, when present), and the
 *  temp dir (needed later to resolve image blocks to real files on disk). */
function extractDoc(file) {
  const path = join(CORPUS, file);
  if (!existsSync(path)) return null;
  const dir = mkdtempSync(join(tmpdir(), "docx-"));
  execSync(`unzip -o -q "${path}" "word/document.xml" "word/_rels/document.xml.rels" "word/media/*" -d "${dir}"`, { stdio: "ignore" });
  const doc = readFileSync(join(dir, "word/document.xml"), "utf8");
  const rels = existsSync(join(dir, "word/_rels/document.xml.rels")) ? relsMap(readFileSync(join(dir, "word/_rels/document.xml.rels"), "utf8")) : {};
  const paraText = (p) => unescapeXml([...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(""));

  // Split the body into ordered segments so tables keep their position.
  const segments = [];
  const tblRe = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
  let last = 0, tm;
  while ((tm = tblRe.exec(doc))) {
    segments.push({ type: "text", xml: doc.slice(last, tm.index) });
    segments.push({ type: "table", xml: tm[0] });
    last = tm.index + tm[0].length;
  }
  segments.push({ type: "text", xml: doc.slice(last) });

  const blocks = [];
  let excerpt = "";
  let awaitingMetaDescription = false;

  for (const seg of segments) {
    if (seg.type === "table") {
      const rows = [...seg.xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((tr) =>
        [...tr[0].matchAll(/<w:tc[ >][\s\S]*?<\/w:tc>/g)]
          .map((tc) => unescapeXml([...tc[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(" ")))
          .filter(Boolean)
          .join(" · "),
      ).filter(Boolean);
      for (const row of rows) blocks.push({ style: "Body", text: row });
      continue;
    }

    const paras = seg.xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (const p of paras) {
      const style = headingStyle(p);
      const text = paraText(p);
      const embeds = [...p.matchAll(/r:embed="(rId\d+)"/g)].map((m) => m[1]);
      const imageTargets = embeds
        .map((rid) => rels[rid])
        .filter((t) => t && /\.(jpe?g|png|gif)$/i.test(t))
        .filter((t) => existsSync(join(dir, "word", t)));

      if (!style && /^meta description:?$/i.test(text)) { awaitingMetaDescription = true; continue; }
      if (!style && awaitingMetaDescription) { if (!excerpt) excerpt = text.slice(0, 220); awaitingMetaDescription = false; continue; }

      if (!text && imageTargets.length === 0) continue;

      if (imageTargets.length) {
        imageTargets.forEach((target, i) => {
          blocks.push({ style: style ?? "Body", text: i === 0 ? text : "", imageRef: target });
        });
        continue;
      }
      if (text) blocks.push({ style: style ?? "Body", text });
    }
  }

  return { blocks, excerpt, dir };
}

/* ── Cloudinary upload ────────────────────────────────────────────────────── */

function sign(params) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(str + CS).digest("hex");
}

async function uploadImage(buf, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = { overwrite: "true", public_id: publicId, timestamp };
  const form = new FormData();
  form.append("file", new Blob([buf]));
  form.append("api_key", CK);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", sign(toSign));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`cloudinary ${publicId}: ${JSON.stringify(json)}`);
  return json.public_id;
}

/* ── Supabase REST helpers (service role, bypasses RLS) ──────────────────── */

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function del(table, params) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
  const res = await fetch(`${URL}/rest/v1/${table}?${qs}`, { method: "DELETE", headers: { ...h, Prefer: "return=minimal" } });
  if (!res.ok) throw new Error(`delete ${table}: ${res.status} ${await res.text()}`);
}

function normalize(rows) {
  if (!rows.length) return rows;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const isArray = Object.fromEntries(keys.map((k) => [k, rows.some((r) => Array.isArray(r[k]))]));
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? (isArray[k] ? [] : null)])));
}

async function insertRows(table, rows) {
  if (!rows.length) return;
  const res = await fetch(`${URL}/rest/v1/${table}`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(normalize(rows)) });
  if (!res.ok) throw new Error(`insert ${table}: ${res.status} ${await res.text()}`);
}

async function patchCityCategory(citySlug, categorySlug, patch) {
  const res = await fetch(
    `${URL}/rest/v1/city_categories?city_slug=eq.${citySlug}&category_slug=eq.${categorySlug}`,
    { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(patch) },
  );
  if (!res.ok) throw new Error(`patch city_categories ${citySlug}/${categorySlug}: ${res.status} ${await res.text()}`);
}

/** Inserts a brand-new article row (used only for the per-category FAQ
 *  companion articles, which scripts/seed.mjs never pre-seeds). `row` must
 *  satisfy every NOT NULL column (title) since this is a real insert. */
async function upsertArticle(slug, row) {
  const res = await fetch(`${URL}/rest/v1/articles?on_conflict=slug`, {
    method: "POST",
    headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ slug, ...row }),
  });
  if (!res.ok) throw new Error(`upsert article ${slug}: ${res.status} ${await res.text()}`);
}

/** Patches an existing article row by slug (the v1.1 tree/legacy article rows
 *  are always pre-seeded by scripts/seed.mjs, so this is a partial update). */
async function patchArticle(slug, patch) {
  const res = await fetch(`${URL}/rest/v1/articles?slug=eq.${slug}`, {
    method: "PATCH",
    headers: { ...h, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patch article ${slug}: ${res.status} ${await res.text()}`);
}

/* ── Image upload + photos row builder, shared by both doc kinds ─────────── */

/**
 * Uploads each classified image to Cloudinary at `guides/<folderSlug>/<category>/<place-or-_category>-<n>`
 * and returns photo rows *without* a city_slug — `folderSlug` is only a
 * Cloudinary path segment (it may be a region slug or "misc" for docs with no
 * single city), never trusted as a `destinations.slug` foreign key. Callers
 * attach the real (possibly null, possibly multi-city) city_slug themselves.
 */
async function uploadImages(images, dir, folderSlug, categorySlug) {
  const counters = new Map();
  const rows = [];
  let uploaded = 0;
  for (const img of images) {
    if (uploaded >= MAX_IMAGES_PER_DOC) break;
    const abs = join(dir, "word", img.ref);
    if (!existsSync(abs)) continue;
    const key = img.placeSlug ?? "_category";
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    const publicId = `guides/${folderSlug}/${categorySlug}/${key}-${n}`;
    try {
      const uploadedId = await uploadImage(readFileSync(abs), publicId);
      rows.push({
        public_id: uploadedId, category_slug: categorySlug,
        place_slug: img.placeSlug ?? null, source_url: img.sourceUrl ?? null, sort_order: n,
      });
      uploaded++;
    } catch (e) {
      console.warn(`  image fail ${publicId}: ${e.message}`);
    }
  }
  return rows;
}

/* ── Category doc ingestion ───────────────────────────────────────────────── */

async function ingestCategoryDoc({ file, citySlug, categorySlug, placeHeadings }) {
  const extracted = extractDoc(file);
  if (!extracted) { console.warn(`skip ${citySlug}/${categorySlug}: missing ${file}`); return; }
  const { blocks, dir } = extracted;
  const result = classify(blocks, { placeHeadings });

  const uploaded = await uploadImages(result.images, dir, citySlug, categorySlug);
  const photoRows = uploaded.map((p) => ({ ...p, city_slug: citySlug }));
  const heroForPlace = (slug) => photoRows.find((p) => p.place_slug === slug)?.public_id;
  const categoryHero = photoRows.find((p) => p.place_slug === null)?.public_id;

  await del("places", { city_slug: citySlug, category_slug: categorySlug });
  await del("photos", { city_slug: citySlug, category_slug: categorySlug });

  const placeRows = result.places.map((p, i) => ({
    slug: p.slug, city_slug: citySlug, category_slug: categorySlug, name: p.name,
    blurb: p.body[0]?.text?.slice(0, 200) ?? "", body: p.body, good_for: p.goodFor,
    good_to_know: p.goodToKnow ?? null, hero_public_id: heroForPlace(p.slug) ?? null, sort_order: (i + 1) * 10,
  }));

  await insertRows("places", placeRows);
  await insertRows("photos", photoRows);
  if (result.intro.length) {
    await patchCityCategory(citySlug, categorySlug, {
      intro: result.intro,
      ...(categoryHero ? { hero_public_id: categoryHero } : {}),
    });
  }
  if (result.faqs.length) {
    const catName = categorySlug.replace(/-/g, " ");
    await upsertArticle(`${citySlug}-${categorySlug}-faq`, {
      destination_slug: citySlug, city_slugs: [citySlug], category_slug: categorySlug,
      title: `${catName[0].toUpperCase()}${catName.slice(1)} FAQs`, category: catName,
      hero_public_id: categoryHero ?? null, excerpt: result.faqs[0]?.q ?? "", body: [], faqs: result.faqs,
      sort_order: 999,
    });
  }
  console.log(`ingested ${citySlug}/${categorySlug}: ${placeRows.length} places, ${photoRows.length} photos, ${result.faqs.length} faqs`);
}

/* ── Whole-article ingestion (docs that are not category-shaped) ─────────── */

async function ingestWholeArticle({ file, slug, citySlugs, categorySlug, regionSlug }) {
  const extracted = extractDoc(file);
  if (!extracted) { console.warn(`skip ${slug}: missing ${file}`); return; }
  const { blocks, excerpt, dir } = extracted;
  const result = classify(blocks, { placeHeadings: [] }); // whole doc: nothing is a place

  const folderSlug = citySlugs[0] ?? regionSlug ?? "misc";
  const uploaded = await uploadImages(result.images, dir, folderSlug, categorySlug);
  const heroPublicId = uploaded[0]?.public_id;

  const patch = {
    destination_slug: citySlugs[0] ?? null, city_slugs: citySlugs, category_slug: categorySlug,
    region_slug: regionSlug ?? null, body: result.intro, faqs: result.faqs,
  };
  if (excerpt) patch.excerpt = excerpt;
  if (heroPublicId) patch.hero_public_id = heroPublicId;
  await patchArticle(slug, patch);

  if (citySlugs.length) {
    for (const city of citySlugs) await del("photos", { city_slug: city, category_slug: categorySlug });
  } else {
    const res = await fetch(`${URL}/rest/v1/photos?city_slug=is.null&category_slug=eq.${categorySlug}`, { method: "DELETE", headers: { ...h, Prefer: "return=minimal" } });
    if (!res.ok) throw new Error(`delete photos (region-only): ${res.status} ${await res.text()}`);
  }
  // A cross-city article's images get one photos row per city (same public_id,
  // cheap to duplicate) so they surface in every relevant gallery; a region-only
  // article (no citySlugs) gets a single city_slug: null row.
  const photoRows = citySlugs.length
    ? citySlugs.flatMap((city) => uploaded.map((p) => ({ ...p, city_slug: city })))
    : uploaded.map((p) => ({ ...p, city_slug: null }));
  await insertRows("photos", photoRows);

  console.log(`ingested article ${slug}: ${result.intro.filter((b) => b.type !== "img").length} blocks, ${photoRows.length} photos, ${result.faqs.length} faqs`);
}

for (const entry of DOC_MAP) {
  try { await ingestCategoryDoc(entry); } catch (e) { console.error(`FAIL ${entry.citySlug}/${entry.categorySlug}: ${e.message}`); }
}
for (const entry of ARTICLE_MAP) {
  try { await ingestWholeArticle(entry); } catch (e) { console.error(`FAIL ${entry.slug}: ${e.message}`); }
}
console.log("done");
