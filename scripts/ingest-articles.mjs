/**
 * Corpus ingestion: all 73 documents in `New Articles - 2026/`.
 *
 * The map is not derived here. `scripts/proposed-map.json` is the reviewed
 * source of truth (produced by scripts/propose-map.mjs, then corrected by
 * hand) and classifies every document as exactly one of five kinds:
 *
 *   category   The document IS a city+category page. Decomposed into a
 *              `city_categories` intro, N `places`, place-tagged `photos`
 *              and FAQs. `placeLevel` says whether an entry is an H3 under a
 *              whitelisted H2, or a numbered H2 in its own right.
 *   hub        The document IS a town's hub page. Its copy becomes
 *              `destinations.standfirst` / `.overview` and `geo_places.body`.
 *              It never produces places.
 *   hub-whole  The 13 "Agent Trek" city guides. Same as hub: the owner
 *              decided these import whole, with no decomposition, even
 *              though their numbered H2s look decomposable.
 *   roundup    A cross-city article scoped to a region, not a city.
 *   article    A cross-city article scoped to named cities.
 *
 * Several documents share a target: three whale-watching docs are all
 * ucluelet/whale-watching, and Whistler has three hub documents. Targets are
 * therefore grouped and written once, with every member document's content
 * merged in file order. Writing them one at a time would leave only the last
 * document standing, because each write deletes the target's existing rows.
 *
 * Prereq: `npm run seed` first (it creates destinations/categories/regions and
 * wipes ingested content). Then this, then `npm run backfill:categories` and
 * `npm run seed:facts`.
 *
 * Run: node --env-file=.env.local scripts/ingest-articles.mjs
 *      ONLY="Tofino - Beaches.docx"     ingest one document
 *      SKIP_IMAGES=1                    write rows without touching Cloudinary
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { classify, slugify } from "./lib/decompose.mjs";
import { splitBlurb, sameText, isRestatementOf } from "./lib/clean.mjs";
import { extractDoc } from "./lib/docx.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "du9doarye";
const CK = process.env.CLOUDINARY_API_KEY;
const CS = process.env.CLOUDINARY_API_SECRET;
const SKIP_IMAGES = process.env.SKIP_IMAGES === "1";
if (!URL || !KEY || (!SKIP_IMAGES && (!CK || !CS))) {
  console.error("Missing Supabase / Cloudinary env.");
  process.exit(1);
}

const CORPUS = fileURLToPath(new global.URL("../New Articles - 2026/", import.meta.url));
const MAP_PATH = fileURLToPath(new global.URL("./proposed-map.json", import.meta.url));
const CACHE_PATH = fileURLToPath(new global.URL("./.cloudinary-cache.json", import.meta.url));
const UPLOAD_CONCURRENCY = 8;

/* ── Per-document overrides ───────────────────────────────────────────────
   proposed-map.json carries the classification. These are the few things it
   cannot carry: the stable article slug for a document that already has a
   seeded row, the region a cross-city roundup belongs to, and a category for
   the one document that has no natural one. Everything else is derived. */

/** Region for each roundup. Read off the document's own title, never guessed. */
const ROUNDUP_REGION = {
  "Best Beaches on Vancouver Island.docx": "vancouver-island",
  "Best Day Hikes on Vancouver Island.docx": "vancouver-island",
  "Best Kayaking Spots on Vancouver Island.docx": "vancouver-island",
  "Best Overnight Hikes on Vancouver Island.docx": "vancouver-island",
  "Best Place to See Whales in BC.docx": "bc",
  "Best Places for Whale Watching on Vancouver Island.docx": "vancouver-island",
  "Farmers Markets in Vancouver_.docx": "bc",
  "How to Choose a Vacation Rental on Vancouver Island.docx": "vancouver-island",
  "Slow Food.docx": "vancouver-island",
  "Top 20 Ski Mountains in BC.docx": "bc",
  "Vancouver Island_ Best Mountain Biking Spots.docx": "vancouver-island",
};

/** Cities for each cross-city article (kind: "article"). */
const ARTICLE_CITIES = {
  "Pacific Rim Whale Festival Guide.docx": ["tofino", "ucluelet"],
  "Whale Tails, Blows, and Backs_ What You’re Actually Seeing on the Water.docx": ["tofino", "ucluelet"],
};

/** Slugs already seeded by scripts/seed.mjs, kept so existing URLs do not move. */
const ARTICLE_SLUG = {
  "Pacific Rim Whale Festival Guide.docx": "pacific-rim-whale-festival-guide",
  "Whale Tails, Blows, and Backs_ What You’re Actually Seeing on the Water.docx": "whale-tails-blows-and-backs",
  "How to Choose a Vacation Rental on Vancouver Island.docx": "how-to-choose-a-vacation-rental",
};

/** The one document with no category of its own: it is a planning piece. */
const CATEGORY_FALLBACK = { "How to Choose a Vacation Rental on Vancouver Island.docx": "when-to-go" };

/** Where a city has several hub documents, this one supplies the orientation
 *  prose and the hero. The others are appended to the geo body in file order. */
const PRIMARY_HUB = {
  tofino: "Tofino.docx",
  squamish: "Squamish - Sports Capital.docx",
  whistler: "Whistler - Agent Trek.docx",
};

/* ── Supabase REST helpers (service role, bypasses RLS) ──────────────────── */

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(path, init) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res;
}

const del = (table, filters) =>
  rest(`${table}?${filters}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

/** PostgREST bulk insert needs every row to share the same keys. */
function normalize(rows) {
  if (!rows.length) return rows;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const isArray = Object.fromEntries(keys.map((k) => [k, rows.some((r) => Array.isArray(r[k]))]));
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? (isArray[k] ? [] : null)])));
}

async function insertRows(table, rows) {
  if (!rows.length) return;
  // Chunked: a single 2,000-row photos insert exceeds the request limit.
  for (let i = 0; i < rows.length; i += 500) {
    await rest(table, {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(normalize(rows.slice(i, i + 500))),
    });
  }
}

const upsert = (table, onConflict, row) =>
  rest(`${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });

const patch = (table, filters, body) =>
  rest(`${table}?${filters}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });

/* ── Cloudinary upload ────────────────────────────────────────────────────── */

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
let cacheDirty = false;

function sign(params) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(str + CS).digest("hex");
}

async function uploadImage(buf, publicId) {
  // Same bytes at the same public id: already there, skip the round trip. This
  // is what makes a re-run of a 1,800-image corpus finish in seconds.
  const key = `${publicId}:${crypto.createHash("sha1").update(buf).digest("hex")}`;
  if (cache[key]) return cache[key];

  const timestamp = Math.floor(Date.now() / 1000);
  const form = new FormData();
  form.append("file", new Blob([buf]));
  form.append("api_key", CK);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", sign({ overwrite: "true", public_id: publicId, timestamp }));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`cloudinary ${publicId}: ${JSON.stringify(json)}`);
  cache[key] = json.public_id;
  cacheDirty = true;
  return json.public_id;
}

/** Runs `worker` over `items` with a fixed number of workers in flight. */
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }));
  return out;
}

/**
 * Uploads classified images under `folder` and returns photo rows without a
 * `city_slug`: `folder` is a Cloudinary path, never a foreign key. Callers
 * attach the real (possibly null, possibly multi-city) city_slug themselves.
 * A failed upload is reported and dropped, never silently swallowed.
 */
async function uploadImages(images, folder, categorySlug, counters = new Map()) {
  const planned = [];
  for (const img of images) {
    const abs = join(img.dir, "word", img.ref);
    if (!existsSync(abs)) continue;
    const key = img.placeSlug ?? "_category";
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    planned.push({ abs, publicId: `${folder}/${key}-${n}`, placeSlug: img.placeSlug ?? null, sourceUrl: img.sourceUrl ?? null, n });
  }
  if (SKIP_IMAGES) {
    return planned.map((p) => ({
      public_id: p.publicId, category_slug: categorySlug, place_slug: p.placeSlug,
      source_url: p.sourceUrl, sort_order: p.n,
    }));
  }

  const results = await pool(planned, UPLOAD_CONCURRENCY, async (p) => {
    try {
      const id = await uploadImage(readFileSync(p.abs), p.publicId);
      return {
        public_id: id, category_slug: categorySlug, place_slug: p.placeSlug,
        source_url: p.sourceUrl, sort_order: p.n,
      };
    } catch (e) {
      imageFailures.push(`${p.publicId}: ${e.message}`);
      return null;
    }
  });
  return results.filter(Boolean);
}

/* ── Document loading ─────────────────────────────────────────────────────── */

const imageFailures = [];
const docLog = [];
const failures = [];

/** Extracts one document and classifies it, tagging each image with its temp dir. */
function loadDoc(entry) {
  const extracted = extractDoc(join(CORPUS, entry.file));
  if (!extracted) throw new Error(`missing file: ${entry.file}`);
  const result = classify(extracted.blocks, {
    placeHeadings: entry.placeHeadings ?? [],
    placeLevel: entry.placeLevel ?? "h3",
  });
  return {
    ...result,
    images: result.images.map((i) => ({ ...i, dir: extracted.dir })),
    excerpt: extracted.excerpt,
    blockCount: extracted.blocks.length,
  };
}

const firstParagraph = (blocks) => blocks.find((b) => b.type === "p" && b.text?.trim())?.text ?? "";
const titleOf = (blocks, fallback) => blocks.find((b) => b.type === "h" && b.text?.trim())?.text ?? fallback;
const fileSlug = (file) => slugify(file.replace(/\.docx$/i, "").replace(/_/g, " "));

/* ── category documents ───────────────────────────────────────────────────── */

async function ingestCategoryGroup(citySlug, categorySlug, entries) {
  const counters = new Map();
  const intro = [];
  const places = [];
  const faqs = [];
  const photoRows = [];
  const seenSlugs = new Set();

  for (const entry of entries) {
    const doc = loadDoc(entry);
    intro.push(...doc.intro);
    faqs.push(...doc.faqs);
    for (const p of doc.places) {
      if (seenSlugs.has(p.slug)) continue; // unique (city, category, slug)
      seenSlugs.add(p.slug);
      places.push(p);
    }
    photoRows.push(...(await uploadImages(doc.images, `guides/${citySlug}/${categorySlug}`, categorySlug, counters))
      .map((p) => ({ ...p, city_slug: citySlug })));
    docLog.push(`  ${entry.file}: ${doc.places.length} places, ${doc.images.length} images, ${doc.faqs.length} faqs`);
  }

  // Only images whose place actually survived may keep their place tag.
  for (const p of photoRows) if (p.place_slug && !seenSlugs.has(p.place_slug)) p.place_slug = null;

  const heroFor = (slug) => photoRows.find((p) => p.place_slug === slug)?.public_id ?? null;
  const categoryHero = photoRows.find((p) => p.place_slug === null)?.public_id ?? null;

  await del("places", `city_slug=eq.${citySlug}&category_slug=eq.${categorySlug}`);
  await del("photos", `city_slug=eq.${citySlug}&category_slug=eq.${categorySlug}`);

  const placeRows = places.map((p, i) => {
    const { blurb, body } = splitBlurb(p.body);
    return {
      slug: p.slug, city_slug: citySlug, category_slug: categorySlug, name: p.name,
      blurb,
      // Never print the standfirst twice: any remaining paragraph identical to
      // the blurb is the same sentence, not a second one.
      body: body.filter((b) => !(b.type === "p" && sameText(b.text, blurb))),
      good_for: p.goodFor, good_to_know: p.goodToKnow ?? null,
      hero_public_id: heroFor(p.slug), sort_order: (i + 1) * 10,
    };
  });

  await insertRows("places", placeRows);
  await insertRows("photos", photoRows);

  await upsert("city_categories", "city_slug,category_slug", {
    city_slug: citySlug, category_slug: categorySlug, intro,
    ...(categoryHero ? { hero_public_id: categoryHero } : {}),
    published: true,
  });

  if (faqs.length) {
    const catName = categorySlug.replace(/-/g, " ");
    await upsert("articles", "slug", {
      slug: `${citySlug}-${categorySlug}-faq`, destination_slug: citySlug, city_slugs: [citySlug],
      category_slug: categorySlug, title: `${catName[0].toUpperCase()}${catName.slice(1)} FAQs`,
      category: catName, hero_public_id: categoryHero, excerpt: faqs[0]?.q ?? "", body: [],
      faqs, sort_order: 999,
    });
  }

  return `category ${citySlug}/${categorySlug}: ${placeRows.length} places, ${photoRows.length} photos, ${faqs.length} faqs`;
}

/* ── hub and hub-whole documents ──────────────────────────────────────────── */

async function ingestHubGroup(citySlug, entries) {
  const primaryFile = PRIMARY_HUB[citySlug];
  const ordered = primaryFile
    ? [...entries].sort((a, b) => (a.file === primaryFile ? -1 : b.file === primaryFile ? 1 : 0))
    : entries;

  const counters = new Map();
  const body = [];
  const faqs = [];
  const photoRows = [];
  let standfirst = "";
  let overview = [];

  for (const [i, entry] of ordered.entries()) {
    const doc = loadDoc(entry);
    body.push(...doc.intro);
    faqs.push(...doc.faqs);
    if (i === 0) {
      standfirst = (doc.excerpt || firstParagraph(doc.intro)).slice(0, 300);
      // The hero prints the standfirst and the reading column prints the
      // overview. A document's meta description is usually the opening of its
      // first paragraph, so keeping both would print the same words twice.
      overview = orientationProse(doc.intro).filter((p, n) => !(n === 0 && isRestatementOf(p, standfirst)));
    }
    photoRows.push(...(await uploadImages(doc.images, `guides/${citySlug}/hub`, null, counters))
      .map((p) => ({ ...p, city_slug: citySlug, place_slug: null })));
    docLog.push(`  ${entry.file}: ${doc.intro.length} blocks, ${doc.images.length} images, ${doc.faqs.length} faqs`);
  }

  const hero = photoRows[0]?.public_id ?? null;

  // The hub's own photos are the ones with no category. Scope the delete to
  // those so a re-run cannot take a category guide's gallery with it.
  await del("photos", `city_slug=eq.${citySlug}&category_slug=is.null`);
  await insertRows("photos", photoRows);

  await patch("destinations", `slug=eq.${citySlug}`, {
    standfirst,
    ...(overview.length ? { overview } : {}),
    ...(hero ? { hero_public_id: hero } : {}),
  });

  // The full document, headings and all, lives on the geo node. `overview` is
  // only the orientation prose the hub template prints beside the facts rail;
  // nothing is lost, because `geo_places.body` holds the whole thing.
  await patch("geo_places", `slug=eq.${citySlug}&type=eq.town`, {
    body, standfirst, ...(hero ? { hero_public_id: hero } : {}), updated_at: new Date().toISOString(),
  });

  if (faqs.length) {
    await upsert("articles", "slug", {
      slug: `${citySlug}-faq`, destination_slug: citySlug, city_slugs: [citySlug],
      title: `${citySlug.replace(/-/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase())} FAQs`,
      category: "Questions", hero_public_id: hero, excerpt: faqs[0]?.q ?? "", body: [],
      faqs, sort_order: 998,
    });
  }

  return `hub ${citySlug}: ${body.length} blocks, ${overview.length} overview paragraphs, ${photoRows.length} photos, ${faqs.length} faqs`;
}

/**
 * The paragraphs that answer "what is this place": everything before the
 * document's first section heading. Falls back to the opening paragraphs when
 * a document dives straight into sections.
 */
function orientationProse(blocks) {
  const afterTitle = blocks[0]?.type === "h" ? blocks.slice(1) : blocks;
  const lead = [];
  for (const b of afterTitle) {
    if (b.type === "h") break;
    if (b.type === "p" && !b.table && b.text?.trim()) lead.push(b.text);
  }
  if (lead.length >= 2) return lead.slice(0, 8);
  return afterTitle.filter((b) => b.type === "p" && !b.table && b.text?.trim()).slice(0, 4).map((b) => b.text);
}

/* ── roundup and article documents ────────────────────────────────────────── */

async function ingestArticleDoc(entry) {
  const doc = loadDoc(entry);
  const slug = ARTICLE_SLUG[entry.file] ?? fileSlug(entry.file);
  // ARTICLE_CITIES covers the multi-town articles. Anything else falls back to
  // the city the map assigned, or the article is orphaned: it never appears on
  // its town's page and never gets a canonical URL under the tree. That is
  // what happened to both Whistler seasonal guides.
  const citySlugs = ARTICLE_CITIES[entry.file] ?? (entry.city ? [entry.city] : []);
  const regionSlug = entry.kind === "roundup" ? ROUNDUP_REGION[entry.file] ?? null : null;
  const categorySlug = entry.cat ?? CATEGORY_FALLBACK[entry.file] ?? null;
  const title = titleOf(doc.intro, entry.file.replace(/\.docx$/i, ""));

  const folder = `guides/_articles/${slug}`;
  const uploaded = await uploadImages(doc.images, folder, categorySlug);
  const hero = uploaded[0]?.public_id ?? null;

  // Scoped by public id prefix: two roundups can share a category, so a
  // delete keyed on category alone would wipe the other one's photos.
  await del("photos", `public_id=like.${encodeURIComponent(`${folder}/*`)}`);
  const photoRows = citySlugs.length
    ? citySlugs.flatMap((city) => uploaded.map((p) => ({ ...p, city_slug: city, place_slug: null })))
    : uploaded.map((p) => ({ ...p, city_slug: null, place_slug: null }));
  await insertRows("photos", photoRows);

  await upsert("articles", "slug", {
    slug, title,
    destination_slug: citySlugs[0] ?? null,
    city_slugs: citySlugs,
    region_slug: regionSlug,
    category_slug: categorySlug,
    category: categorySlug ? categorySlug.replace(/-/g, " ") : null,
    excerpt: (doc.excerpt || firstParagraph(doc.intro)).slice(0, 300),
    body: doc.intro,
    faqs: doc.faqs,
    hero_public_id: hero,
    published: true,
    sort_order: 100,
  });

  docLog.push(`  ${entry.file}: ${doc.intro.length} blocks, ${doc.images.length} images, ${doc.faqs.length} faqs`);
  return `${entry.kind} ${slug}: ${doc.intro.length} blocks, ${photoRows.length} photos, ${doc.faqs.length} faqs`;
}

/* ── Run ──────────────────────────────────────────────────────────────────── */

const only = process.env.ONLY;
const map = JSON.parse(readFileSync(MAP_PATH, "utf8")).filter((e) => !only || e.file === only);

const kinds = map.reduce((a, e) => ({ ...a, [e.kind]: (a[e.kind] ?? 0) + 1 }), {});
console.log(`corpus map: ${map.length} documents ${JSON.stringify(kinds)}`);

const missing = map.filter((e) => !existsSync(join(CORPUS, e.file)));
if (missing.length) {
  console.error(`ABORT: ${missing.length} mapped documents are not on disk:`);
  for (const m of missing) console.error(`  ${m.file}`);
  process.exit(1);
}

/** Groups whose members must be written together, keyed by their target row. */
function group(entries, keyOf) {
  const out = new Map();
  for (const e of entries) {
    const k = keyOf(e);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(e);
  }
  return out;
}

const processed = new Set();

async function run(label, files, fn) {
  docLog.push(label);
  try {
    const summary = await fn();
    for (const f of files) processed.add(f);
    console.log(`OK   ${summary}`);
  } catch (e) {
    failures.push({ files, reason: e.message });
    console.error(`FAIL ${label}: ${e.message}`);
  }
}

const categoryDocs = map.filter((e) => e.kind === "category");
for (const [key, entries] of group(categoryDocs, (e) => `${e.city}/${e.cat}`)) {
  const [city, cat] = key.split("/");
  await run(`category ${key} (${entries.length} doc${entries.length > 1 ? "s" : ""})`,
    entries.map((e) => e.file), () => ingestCategoryGroup(city, cat, entries));
}

const hubDocs = map.filter((e) => e.kind === "hub" || e.kind === "hub-whole");
for (const [city, entries] of group(hubDocs, (e) => e.city)) {
  await run(`hub ${city} (${entries.length} doc${entries.length > 1 ? "s" : ""})`,
    entries.map((e) => e.file), () => ingestHubGroup(city, entries));
}

for (const entry of map.filter((e) => e.kind === "roundup" || e.kind === "article")) {
  await run(`${entry.kind} ${entry.file}`, [entry.file], () => ingestArticleDoc(entry));
}

if (cacheDirty) writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0));

console.log("\n── per document ──");
for (const line of docLog) console.log(line);

const unprocessed = map.filter((e) => !processed.has(e.file));
console.log(`\n${processed.size}/${map.length} documents ingested.`);
if (imageFailures.length) {
  console.log(`\n${imageFailures.length} image uploads failed:`);
  for (const f of imageFailures.slice(0, 40)) console.log(`  ${f}`);
}
if (unprocessed.length) {
  console.error(`\nFAILED DOCUMENTS (${unprocessed.length}) — these are failures, not skips:`);
  for (const e of unprocessed) {
    const why = failures.find((f) => f.files.includes(e.file))?.reason ?? "not reached";
    console.error(`  ${e.file} [${e.kind}] -> ${why}`);
  }
  process.exit(1);
}
console.log("done: every mapped document was ingested.");
