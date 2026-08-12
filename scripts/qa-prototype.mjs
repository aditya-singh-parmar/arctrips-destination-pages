// Prototype QA. Crawls every page, validates every internal link, anchor target,
// image and hard rule. Run: node scripts/qa-prototype.mjs
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { FILE_FOR } from './lib/routes.mjs';
const DIR = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : 'design/prototype';
const pages = readdirSync(DIR).filter(f => f.endsWith('.html') && !f.startsWith('_'));
let fail = 0;
const say = (t, m) => { if (t) return; fail++; console.log('  FAIL ' + m); };
for (const p of pages) {
  const s = readFileSync(join(DIR, p), 'utf8');
  const self = p;
  const selfRoute = Object.entries(FILE_FOR).find(([, f]) => f === p)?.[0];
  const ids = new Set([...s.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const [, h, txt] of s.matchAll(/href="([^"]+)"[^>]*>([^<]{0,40})/g)) {
    if (/^(https?:|mailto:|tel:)/.test(h)) continue;
    if (/[$'`+{]/.test(h)) continue; // JS template, not a literal href
    if (h === '#' || h === '') say(false, `${p}: dead link "${txt.trim()}"`);
    else if (h === self) say(false, `${p}: self-reload "${txt.trim()}"`);
    else if (h.startsWith('#')) say(ids.has(h.slice(1)), `${p}: missing anchor ${h} ("${txt.trim()}")`);
    else if (h.endsWith('.html')) say(false, `${p}: raw .html link ${h} (routes are clean URLs, see scripts/lib/routes.mjs)`);
    else if (h.startsWith('/prototype/')) { /* asset, checked below and by sync-prototype */ }
    else if (h.startsWith('/')) {
      const route = h.split(/[?#]/)[0];
      const f = FILE_FOR[route];
      say(!!f && existsSync(join(DIR, f)), `${p}: broken link ${h}`);
      /* a bare link to your own route reloads the page; the same route with a
         hash or a query is an in-page jump or a new search, and is fine */
      if (h === selfRoute) say(false, `${p}: self-reload "${txt.trim()}"`);
    }
  }
  for (const [, src] of s.matchAll(/src="\/prototype\/(media\/[^"]+)"/g))
    say(existsSync(join(DIR, src)), `${p}: missing image ${src}`);

  // Semantic checks: a link's label must agree with where it goes, and a field
  // named as an image must not hold a page filename.
  const SUBJ = ['beaches','hiking','kayaking','restaurants','surfing','birding','fishing','storm-watching','whale-watching','camping'];
  for (const [, h, txt] of s.matchAll(/href="(\/[a-z0-9\-\/]+)"[^>]*>([^<]{4,60})</g)) {
    const t = txt.toLowerCase();
    const generic = /\/(things-to-do|search|plan|guides|not-found|vancouver-island)$|^\/(tofino|ucluelet)?$/.test(h);
    if (generic) continue;
    for (const sub of SUBJ) {
      const word = sub.split('-')[0];
      if (t.includes(word) && !h.includes(word))
        say(false, `${p}: label "${txt.trim()}" points at ${h}`);
    }
  }
  for (const [, field, val] of s.matchAll(/"(h|hero|img|photo)":"([a-z0-9\-]+\.html)"/g))
    say(false, `${p}: image field "${field}" holds a page name (${val})`);
  // the shared place-bar behaviour must be present, or the active state goes stale
  if (/placebar__links/.test(s)) say(/_nav\.js/.test(s), `${p}: place bar without the shared _nav.js scrollspy`);
  // every executable script block must parse. A regex edit that eats a paren is silent otherwise.
  for (const [, code] of s.matchAll(/<script(?![^>]*src)(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)) {
    try { new Function(code); } catch (e) { say(false, `${p}: script block does not parse (${e.message})`); }
  }
  say(!/istockphoto\.com/.test(s), `${p}: leaked image credit URL`);
  say(!/w:pBdr|w:rPr|w:bookmarkStart/.test(s), `${p}: raw Word XML in the markup`);
  say(!/Qualicum Beach/.test(s), `${p}: references Qualicum Beach, which has no page`);
  say(!/[—–]/.test(s), `${p}: contains an em or en dash`);
  say(!/(?:Meta Description|SEO Title)\s*:/i.test(s.replace(/\/\*[\s\S]*?\*\//g, '')), `${p}: leaked editorial prefix`);
  for (const [, img] of s.matchAll(/(<img(?![^>]*\balt=)[^>]*>)/g))
    say(false, `${p}: image without alt ${img.slice(0, 60)}`);
}
// Counts must not drift between pages. These are the agreed figures.
const BAD = { '25 towns':'26 towns', '27 towns':'26 towns', '28 towns':'26 towns',
              '12 towns':'11 towns', '16 towns':'15 towns', '14 towns':'15 towns' };
for (const p of pages) {
  const s2 = readFileSync(join(DIR, p), 'utf8');
  for (const [wrong, right] of Object.entries(BAD))
    if (s2.includes(wrong)) { fail++; console.log(`  FAIL ${p}: countDrift says "${wrong}", agreed figure is "${right}"`); }
}
console.log(fail ? `\n${fail} issue(s) across ${pages.length} pages` : `clean: ${pages.length} pages, every link, anchor and image valid`);
process.exit(fail ? 1 : 0);
