/**
 * Dumps the real heading structure of every .docx in the corpus so the
 * per-doc ingest mapping can be READ rather than guessed. CLAUDE.md is
 * explicit that placeHeadings must never be inferred: a wrong whitelist
 * turns "Frequently Asked Questions" H3s into place pages titled
 * "Can you swim in Tofino?".
 *
 * Writes scripts/corpus-structure.json.
 * Run: node scripts/analyze-corpus.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CORPUS = fileURLToPath(new URL("../New Articles - 2026/", import.meta.url));

function headings(file) {
  const dir = mkdtempSync(join(tmpdir(), "doc-"));
  execSync(`unzip -qo ${JSON.stringify(join(CORPUS, file))} -d ${JSON.stringify(dir)}`);
  const xml = readFileSync(join(dir, "word/document.xml"), "utf8");
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const out = [];
  let words = 0, images = 0, tables = 0;
  for (const p of paras) {
    const style = /w:val="(Heading[1-9]|Title)"/.exec(p);
    const text = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
      .map((t) => t.replace(/<[^>]+>/g, "")).join("")
      .replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
    if (/<w:drawing/.test(p)) images++;
    if (text) words += text.split(/\s+/).length;
    if (!style || !text) continue;
    out.push({ level: style[1] === "Title" ? "H1" : "H" + style[1].replace("Heading", ""), text });
  }
  tables = (xml.match(/<w:tbl>/g) || []).length;
  return { out, words, images, tables };
}

const files = readdirSync(CORPUS).filter((f) => f.endsWith(".docx") && !f.startsWith("~$")).sort();
const result = {};
for (const f of files) {
  try {
    const { out, words, images, tables } = headings(f);
    const h1 = out.find((h) => h.level === "H1")?.text || null;
    const h2 = out.filter((h) => h.level === "H2").map((h) => h.text);
    // H3s grouped under the H2 that precedes them: this is what decides
    // whether an H2 is a place-listing section.
    const groups = {};
    let cur = null;
    for (const h of out) {
      if (h.level === "H2") { cur = h.text; groups[cur] = []; }
      else if (h.level === "H3" && cur) groups[cur].push(h.text);
    }
    result[f] = { h1, h2, groups, words, images, tables, headingCount: out.length };
    console.log(`${f.padEnd(48)} H1:${h1 ? "y" : "n"} H2:${String(h2.length).padStart(2)} H3:${String(out.filter(h=>h.level==="H3").length).padStart(3)} ${String(words).padStart(6)}w ${String(images).padStart(3)}img ${String(tables).padStart(2)}tbl`);
  } catch (e) {
    result[f] = { error: e.message };
    console.log(`${f.padEnd(48)} ERROR ${e.message}`);
  }
}
writeFileSync(new URL("./corpus-structure.json", import.meta.url), JSON.stringify(result, null, 1));
console.log(`\n${files.length} documents analysed -> scripts/corpus-structure.json`);
