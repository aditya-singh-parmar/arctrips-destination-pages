/**
 * docx reader: `word/document.xml` -> ordered {style,text,imageRef} blocks.
 *
 * Split out of scripts/ingest-articles.mjs so the extraction layer can be
 * probed and tested on its own. Everything here is IO-bound (it unzips into a
 * temp dir); the pure classification lives in ./decompose.mjs.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

/**
 * Unzips one docx and returns ordered classify()-ready blocks, the extracted
 * excerpt (from a "Meta Description:" label paragraph, when present), and the
 * temp dir (needed later to resolve image blocks to real files on disk).
 * Returns null when the file does not exist.
 */
export function extractDoc(path) {
  if (!existsSync(path)) return null;
  const dir = mkdtempSync(join(tmpdir(), "docx-"));
  execSync(
    `unzip -o -q "${path}" "word/document.xml" "word/_rels/document.xml.rels" "word/media/*" -d "${dir}"`,
    { stdio: "ignore" },
  );
  const doc = readFileSync(join(dir, "word/document.xml"), "utf8");
  const relsPath = join(dir, "word/_rels/document.xml.rels");
  const rels = existsSync(relsPath) ? relsMap(readFileSync(relsPath, "utf8")) : {};
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
      // A table's first row is its header. It carries column labels
      // ("Beach", "Location", "Best For") that are meaningless once the
      // table is flattened to paragraphs, so it is marked rather than
      // dropped here and filtered by the classifier.
      const rows = [...seg.xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((tr) =>
        [...tr[0].matchAll(/<w:tc[ >][\s\S]*?<\/w:tc>/g)]
          .map((tc) => unescapeXml([...tc[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(" ")))
          .filter(Boolean)
          .join(" · "),
      ).filter(Boolean);
      rows.forEach((row, i) => blocks.push({ style: "Body", text: row, table: true, tableHeader: i === 0 }));
      continue;
    }

    const paras = seg.xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (const p of paras) {
      const style = headingStyle(p);
      const text = paraText(p);
      const embeds = [...p.matchAll(/r:embed="(rId\d+)"/g)].map((m) => m[1]);
      const imageTargets = embeds
        .map((rid) => rels[rid])
        .filter((t) => t && /\.(jpe?g|png|gif|webp)$/i.test(t))
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
      blocks.push({ style: style ?? "Body", text });
    }
  }

  return { blocks, excerpt, dir };
}
