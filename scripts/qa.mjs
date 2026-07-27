/**
 * Production QA gate. Crawls the running app and asserts the contract:
 * every internal link resolves, the SEO contract holds, no page ships
 * unformatted text, and the sitemaps are sane.
 *
 * Run against a built app:  PORT=3111 npm start   then   node scripts/qa.mjs
 */
const BASE = process.env.QA_BASE || "http://localhost:3111";
const fails = [], warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

async function get(path) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 30000);
  try {
    const r = await fetch(BASE + path, { redirect: "manual", signal: ac.signal });
    return { status: r.status, loc: r.headers.get("location"), html: await r.text() };
  } finally { clearTimeout(t); }
}

/* ── 1. Crawl every internal link ─────────────────────────────────────────── */
const seen = new Set(), queue = ["/", "/destinations"];
let crawled = 0;
while (queue.length) {
  const p = queue.shift();
  if (seen.has(p) || seen.size > 400) continue;
  seen.add(p);
  let r;
  try { r = await get(p); } catch (e) { fail(`FETCH ${p} ${e.name}`); continue; }
  if (r.status >= 300 && r.status < 400) { warn(`redirect ${p} -> ${r.status} ${r.loc}`); continue; }
  if (r.status !== 200) { fail(`${r.status} ${p}`); continue; }
  crawled++;

  // ── 2. Unformatted text: the owner's repeated complaint ────────────────
  const body = r.html.replace(/<script[\s\S]*?<\/script>/g, "");
  if (body.includes("—")) fail(`em dash on ${p}`);
  if (/<em>|<i>(?!nput)/.test(body)) fail(`italics on ${p}`);
  if (/\(\s*(add|todo|tbd|check|fix)\b/i.test(body)) fail(`unresolved editorial note on ${p}`);
  if (/istockphoto\.com|gettyimages/i.test(body)) fail(`stock photo URL leaked into copy on ${p}`);
  if (/·\s*location\s*·|>\s*Best For\s*</i.test(body)) fail(`table header leaked into copy on ${p}`);
  if (/undefined|\[object Object\]|NaN/.test(body)) fail(`placeholder value rendered on ${p}`);
  if (/<h[1-6][^>]*>\s*<\/h[1-6]>/.test(body)) fail(`empty heading on ${p}`);

  // ── 3. SEO contract ────────────────────────────────────────────────────
  if (p.startsWith("/destinations") || p.startsWith("/travel-guides")) {
    if (!/rel="canonical"/.test(r.html)) fail(`no canonical on ${p}`);
    if (/rel="canonical" href="[^"]*\/"/.test(r.html)) fail(`canonical has trailing slash on ${p}`);
    if (!/application\/ld\+json/.test(r.html)) warn(`no JSON-LD on ${p}`);
    for (const m of r.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1].replace(/\\u003c/g, "<")); }
      catch { fail(`invalid JSON-LD on ${p}`); }
    }
  }
  if (!/<title>/.test(r.html)) fail(`no title on ${p}`);

  for (const m of body.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (!seen.has(href) && seen.size + queue.length < 400) queue.push(href);
  }
}

/* ── 4. Trailing slash is rewritten, never redirected ─────────────────────── */
const slash = await get("/destinations/");
if (slash.status !== 200) fail(`trailing slash returned ${slash.status}, expected 200 rewrite`);

/* ── 5. Sitemaps ─────────────────────────────────────────────────────────── */
for (const sm of ["/sitemap-destinations.xml", "/sitemap-travel-guides.xml", "/robots.txt"]) {
  const r = await get(sm);
  if (r.status !== 200) fail(`${sm} returned ${r.status}`);
  else if (sm.endsWith(".xml")) {
    const n = (r.html.match(/<url>/g) || []).length;
    if (!n) fail(`${sm} is empty`);
    else console.log(`  ${sm}: ${n} urls`);
  }
}

/* ── 6. A 404 must still be a 404 ────────────────────────────────────────── */
const nf = await get("/destinations/canada/bc/definitely-not-a-place");
if (nf.status !== 404) fail(`unknown URL returned ${nf.status}, expected 404`);

console.log(`\ncrawled ${crawled} pages`);
if (warns.length) { console.log(`\n${warns.length} warnings:`); warns.slice(0, 15).forEach((w) => console.log("  ! " + w)); }
if (fails.length) { console.log(`\n${fails.length} FAILURES:`); fails.slice(0, 40).forEach((f) => console.log("  x " + f)); process.exit(1); }
console.log("\nQA PASSED");
