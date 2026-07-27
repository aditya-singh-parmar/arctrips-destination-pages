/**
 * Proposes DOC_MAP entries from the real heading structure, then prints every
 * decision so the whitelist can be reviewed rather than trusted. An H2 only
 * becomes a place-listing section if it actually holds child H3s AND is not
 * one of the non-place section types the corpus uses consistently
 * (FAQ, seasons, species groups, gear, safety, events, closing).
 */
import { readFileSync, writeFileSync } from "node:fs";
const S = JSON.parse(readFileSync(new URL("./corpus-structure.json", import.meta.url), "utf8"));

const NOT_PLACES =
  /frequently asked|^faq|common questions|final thought|final word|what to (wear|bring|pack|see|expect)|safety|^tips|helpful tips|etiquette|best time|^why |beginners?\b|what makes|how to|vs |compare|\bevents?\b|by season|common (birds|wildlife)|what wildlife|rentals|lessons|costs?$|getting (there|around)|where to stay|packing|types? of|what you might see|seasons?$|wildlife to see|good to know|about /i;

const CITY = [
  [/Tofino/i, "tofino"], [/Ucluelet/i, "ucluelet"], [/Victoria/i, "victoria"],
  [/Squamish/i, "squamish"], [/Whistler/i, "whistler"], [/Nanaimo/i, "nanaimo"],
  [/Sooke/i, "sooke"], [/Sidney/i, "sidney"], [/Chemainus/i, "chemainus"],
  [/Shawnigan/i, "shawnigan-lake"], [/Nanoose/i, "nanoose-bay"],
  [/Parksville|Qualicum/i, "parksville"], [/Campbell River/i, "campbell-river"],
  [/Nelson/i, "nelson"], [/Banff/i, "banff"], [/Jasper/i, "jasper"],
  [/Edmonton/i, "edmonton"], [/Ottawa/i, "ottawa"], [/Niagara/i, "niagara-falls"],
  [/Montreal/i, "montreal"], [/Quebec City/i, "quebec-city"], [/Halifax/i, "halifax"],
  [/St\. John/i, "st-johns"], [/Charlottetown/i, "charlottetown"],
  [/Saskatoon/i, "saskatoon"], [/Vancouver -/i, "vancouver"],
];
const CAT = [
  [/Beach/i, "beaches"], [/Surf/i, "surfing"], [/Kayak|Paddl/i, "kayaking"],
  [/Fishing/i, "fishing"], [/Hot Spring/i, "hot-springs"], [/Whale/i, "whale-watching"],
  [/Bird|Seabird/i, "birding"], [/Storm/i, "storm-watching"],
  [/Hik|Trail|Walking/i, "hiking"], [/Mountain Bik|Biking/i, "mountain-biking"],
  [/Ski|Snowboard/i, "skiing"], [/Campground|Camping/i, "camping"],
  [/Restaurant|Food/i, "restaurants"], [/Market/i, "markets"],
  [/Scenic|Things to See/i, "landmarks"], [/Wildlife/i, "birding"],
];
const pick = (list, s) => (list.find(([re]) => re.test(s)) || [])[1];

const out = [];
for (const [file, d] of Object.entries(S)) {
  if (d.error) { out.push({ file, error: d.error }); continue; }
  const city = pick(CITY, file);
  const cat = pick(CAT, file);
  // An H2 with children that is not a known non-place section.
  const placeHeadings = Object.entries(d.groups)
    .filter(([h2, kids]) => kids.length >= 2 && !NOT_PLACES.test(h2))
    .map(([h2]) => h2);
  // Some docs list places at H2 level directly (numbered scenic spots).
  const numberedH2 = d.h2.filter((h) => /^\d+\./.test(h.trim()));
  const agentTrek = /Agent Trek/.test(file);
  const regional = /Vancouver Island|in BC|Best Place to See Whales|Farmers Markets|Slow Food|Top 20 Ski/i.test(file) && !city;
  let kind;
  if (agentTrek) kind = "hub-whole";          // owner decision: import whole
  else if (regional) kind = "roundup";        // region scoped article
  else if (city && !cat) kind = "hub";        // destination hub body
  else if (city && cat) kind = "category";    // category guide with places
  else kind = "article";                      // cross cutting reading
  // "Top 10 Scenic Spots" style docs put each place at H2 with a leading
  // ordinal, so the places live one level up and there is no whitelist.
  const placeLevel = kind === "category" && numberedH2.length >= 5 ? "h2" : "h3";
  out.push({ file, kind, city, cat, words: d.words, images: d.images, placeLevel,
             placeHeadings: kind === "category" && placeLevel === "h3" ? placeHeadings : [],
             numberedH2: numberedH2.length, h2count: d.h2.length });
}
writeFileSync(new URL("./proposed-map.json", import.meta.url), JSON.stringify(out, null, 1));

const byKind = {};
for (const r of out) (byKind[r.kind] = byKind[r.kind] || []).push(r);
console.log("── COVERAGE ──");
let total = 0;
for (const [k, v] of Object.entries(byKind)) { total += v.length; console.log(`  ${k.padEnd(12)} ${String(v.length).padStart(2)}`); }
console.log(`  ${"TOTAL".padEnd(12)} ${total} of ${Object.keys(S).length}`);
console.log("\n── CATEGORY GUIDES: place sections (review) ──");
for (const r of out) {
  if (r.kind !== "category") continue;
  console.log(`\n${r.file}  [${r.city || "NO CITY"} / ${r.cat || "NO CAT"}]${r.numberedH2 ? `  (${r.numberedH2} numbered H2)` : ""}`);
  if (r.placeLevel === "h2") console.log(`   (places at H2: ${r.numberedH2} numbered)`);
  r.placeHeadings.forEach((h) => console.log("   + " + h));
}
console.log("\n── HUBS, ROUNDUPS, ARTICLES ──");
for (const k of ["hub", "hub-whole", "roundup", "article"])
  (byKind[k] || []).forEach((r) => console.log(`  ${k.padEnd(10)} ${(r.city || "-").padEnd(16)} ${r.file}`));
const gaps = out.filter((r) => r.kind === "category" && !r.placeHeadings.length);
if (gaps.length) { console.log("\n── CATEGORY GUIDES WITH NO PLACE SECTIONS (body only, legitimate) ──");
  gaps.forEach((r) => console.log(`  ${r.file}`)); }
