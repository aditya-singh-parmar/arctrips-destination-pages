/**
 * Ingest guide content from the New Articles corpus (.docx) into Supabase.
 * For each mapped article: extracts ordered headings/paragraphs + inline images,
 * uploads images to Cloudinary, and PATCHes the articles row (body, hero, excerpt).
 *
 * Prereq: run `npm run seed` first (creates the article rows).
 * Run: node --env-file=.env.local scripts/ingest-articles.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "djqswlfat";
const CK = process.env.CLOUDINARY_API_KEY;
const CS = process.env.CLOUDINARY_API_SECRET;
if (!URL || !KEY || !CK || !CS) { console.error("Missing Supabase / Cloudinary env."); process.exit(1); }

const CORPUS = fileURLToPath(new global.URL("../New Articles - 2026/", import.meta.url));
const MAX_IMAGES = 8; // cap uploads per article

// article slug -> docx filename
const MAP = {
  "tofino-beaches": "Tofino - Beaches.docx",
  "tofino-surfing": "Tofino - Surfing.docx",
  "tofino-kayaking": "Tofino - Kayaking.docx",
  "tofino-storm-watching": "Tofino - Storm Watching.docx",
  "tofino-wildlife-tours": "Tofino - Wildlife tours.docx",
  "tofino-restaurants": "Tofino - Restaurants_.docx",
  "ucluelet-hiking": "Ucluelet - Hiking Guide.docx",
  "ucluelet-kayaking": "Ucluelet - Kayaking.docx",
  "ucluelet-wildlife-watching": "Ucluelet - Wildlife watching.docx",
  "ucluelet-restaurants": "Ucluelet - Restaurants.docx",
};

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
  return { publicId: json.public_id, w: json.width, h: json.height };
}

async function patchArticle(slug, patch) {
  const res = await fetch(`${URL}/rest/v1/articles?slug=eq.${slug}`, {
    method: "PATCH",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patch ${slug}: ${res.status} ${await res.text()}`);
}

async function ingest(slug, file) {
  const path = join(CORPUS, file);
  if (!existsSync(path)) { console.warn(`skip ${slug}: missing ${file}`); return; }
  const dir = mkdtempSync(join(tmpdir(), "docx-"));
  execSync(`unzip -o -q "${path}" "word/document.xml" "word/_rels/document.xml.rels" "word/media/*" -d "${dir}"`, { stdio: "ignore" });
  const doc = readFileSync(join(dir, "word/document.xml"), "utf8");
  const rels = existsSync(join(dir, "word/_rels/document.xml.rels")) ? relsMap(readFileSync(join(dir, "word/_rels/document.xml.rels"), "utf8")) : {};

  const blocks = [];
  const ctx = { excerpt: "", prevMetaLabel: false, titleSkipped: false, imgCount: 0, firstImage: null };
  const paraText = (p) => unescapeXml([...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(""));

  // Split the body into ordered segments so tables keep their position and
  // their inner paragraphs are not also emitted as loose text.
  const segments = [];
  const tblRe = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
  let last = 0, tm;
  while ((tm = tblRe.exec(doc))) {
    segments.push({ type: "text", xml: doc.slice(last, tm.index) });
    segments.push({ type: "table", xml: tm[0] });
    last = tm.index + tm[0].length;
  }
  segments.push({ type: "text", xml: doc.slice(last) });

  let listBuf = null;
  const flushList = () => { if (listBuf && listBuf.length) blocks.push({ type: "list", items: listBuf }); listBuf = null; };

  for (const seg of segments) {
    if (seg.type === "table") {
      flushList();
      const rows = [...seg.xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((tr) =>
        [...tr[0].matchAll(/<w:tc[ >][\s\S]*?<\/w:tc>/g)].map((tc) =>
          unescapeXml([...tc[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(" ")),
        ),
      ).filter((r) => r.some((c) => c));
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }
    const paras = seg.xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (const p of paras) {
      const isHeading = /w:pStyle[^>]*w:val="(Heading[1-6]|Title|Subtitle)"/.test(p);
      const isList = /<w:numPr[ >]/.test(p);
      const text = paraText(p);
      const embeds = [...p.matchAll(/r:embed="(rId\d+)"/g)].map((m) => m[1]);

      if (text && text.length >= 2) {
        if (/^https?:\/\//i.test(text)) { /* skip stray url */ }
        else if (ctx.prevMetaLabel) { if (!ctx.excerpt) ctx.excerpt = text.slice(0, 220); ctx.prevMetaLabel = false; }
        else if (/^meta description:?$/i.test(text)) { ctx.prevMetaLabel = true; }
        else if (!ctx.titleSkipped) { ctx.titleSkipped = true; }
        else if (isList) { if (!listBuf) listBuf = []; listBuf.push(text); }
        else { flushList(); blocks.push({ type: isHeading ? "h" : "p", text }); }
      }

      for (const rid of embeds) {
        if (ctx.imgCount >= MAX_IMAGES) break;
        const target = rels[rid];
        if (!target || !/\.(jpe?g|png|gif)$/i.test(target)) continue;
        const mediaPath = join(dir, "word", target);
        if (!existsSync(mediaPath)) continue;
        const pid = `guides/${slug}/img${ctx.imgCount + 1}`;
        try {
          flushList();
          const up = await uploadImage(readFileSync(mediaPath), pid);
          blocks.push({ type: "img", publicId: up.publicId, w: up.w, h: up.h });
          if (!ctx.firstImage) ctx.firstImage = up.publicId;
          ctx.imgCount++;
        } catch (e) { console.warn(`  img fail ${pid}: ${e.message}`); }
      }
    }
    flushList();
  }

  const excerpt = ctx.excerpt, firstImage = ctx.firstImage, imgCount = ctx.imgCount;
  const patch = { body: blocks };
  if (excerpt) patch.excerpt = excerpt;
  if (firstImage) patch.hero_public_id = firstImage;
  await patchArticle(slug, patch);
  console.log(`ingested ${slug}: ${blocks.filter((b) => b.type !== "img").length} text blocks, ${imgCount} images`);
}

for (const [slug, file] of Object.entries(MAP)) {
  try { await ingest(slug, file); } catch (e) { console.error(`FAIL ${slug}: ${e.message}`); }
}
console.log("done");
