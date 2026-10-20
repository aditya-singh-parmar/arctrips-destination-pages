/* Writes <link rel="canonical"> into every routed page in design/prototype,
   from ROUTES and SITE_ORIGIN. Idempotent: it replaces its own tag in place.

   Why: /Tofino, /tofino?x=1 and /tofino all answer 200 with the same page.
   Without a canonical, crawlers treat them as three URLs. The tag names the
   one real URL for each page.

   Run: node scripts/canonical-rebuild.mjs [--check]
   Then: node scripts/sync-prototype.mjs */
import { readFileSync, writeFileSync } from 'fs';
import { ROUTES, canonicalFor, NOINDEX_ROUTES } from './lib/routes.mjs';

const DIR = 'design/prototype';
const CHECK = process.argv.includes('--check');
const TAG = /<link rel="canonical" href="[^"]*">\n?/;
let stale = 0;

for (const [file, route] of Object.entries(ROUTES)) {
  if (NOINDEX_ROUTES.includes(route)) continue; // not-found is noindex; a canonical would contradict it
  const path = `${DIR}/${file}`;
  const html = readFileSync(path, 'utf8');
  const tag = `<link rel="canonical" href="${canonicalFor(route)}">\n`;
  let next;
  if (TAG.test(html)) next = html.replace(TAG, tag);
  else if (/<meta name="description"[^>]*>\n/.test(html)) next = html.replace(/(<meta name="description"[^>]*>\n)/, `$1${tag}`);
  else throw new Error(`${file}: no description meta to anchor the canonical after`);
  if (next !== html) {
    stale++;
    if (!CHECK) writeFileSync(path, next);
  }
}
console.log(`${stale} page(s) ${CHECK ? 'out of date' : 'updated'}`);
if (CHECK && stale) process.exit(1);
