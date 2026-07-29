// Prototype QA. Crawls every page, validates every internal link, anchor target,
// image and hard rule. Run: node scripts/qa-prototype.mjs
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
const DIR = 'design/prototype';
const pages = readdirSync(DIR).filter(f => f.endsWith('.html') && !f.startsWith('_'));
let fail = 0;
const say = (t, m) => { if (t) return; fail++; console.log('  FAIL ' + m); };
for (const p of pages) {
  const s = readFileSync(join(DIR, p), 'utf8');
  const self = p;
  const ids = new Set([...s.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const [, h, txt] of s.matchAll(/href="([^"]+)"[^>]*>([^<]{0,40})/g)) {
    if (/^(https?:|mailto:|tel:)/.test(h)) continue;
    if (/[$'`+{]/.test(h)) continue; // JS template, not a literal href
    if (h === '#' || h === '') say(false, `${p}: dead link "${txt.trim()}"`);
    else if (h === self) say(false, `${p}: self-reload "${txt.trim()}"`);
    else if (h.startsWith('#')) say(ids.has(h.slice(1)), `${p}: missing anchor ${h} ("${txt.trim()}")`);
    else if (h.endsWith('.html')) say(existsSync(join(DIR, h)), `${p}: broken link ${h}`);
  }
  for (const [, src] of s.matchAll(/src="(media\/[^"]+)"/g))
    say(existsSync(join(DIR, src)), `${p}: missing image ${src}`);

  // Semantic checks: a link's label must agree with where it goes, and a field
  // named as an image must not hold a page filename.
  const SUBJ = ['beaches','hiking','kayaking','restaurants','surfing','birding','fishing','storm-watching','whale-watching','camping'];
  for (const [, h, txt] of s.matchAll(/href="([a-z0-9\-]+\.html)"[^>]*>([^<]{4,60})</g)) {
    const t = txt.toLowerCase();
    const generic = /^(things-to-do|search|index|plan|guide|not-found|region|province|country|tofino)\.html$/.test(h);
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
  say(!/[—–]/.test(s), `${p}: contains an em or en dash`);
  say(!/(?:Meta Description|SEO Title)\s*:/i.test(s.replace(/\/\*[\s\S]*?\*\//g, '')), `${p}: leaked editorial prefix`);
  for (const [, img] of s.matchAll(/(<img(?![^>]*\balt=)[^>]*>)/g))
    say(false, `${p}: image without alt ${img.slice(0, 60)}`);
}
console.log(fail ? `\n${fail} issue(s) across ${pages.length} pages` : `clean: ${pages.length} pages, every link, anchor and image valid`);
process.exit(fail ? 1 : 0);
