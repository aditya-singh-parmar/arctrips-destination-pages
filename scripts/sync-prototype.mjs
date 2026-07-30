/* design/prototype is where the prototype is edited. public/prototype is the copy
   Vercel actually serves at /prototype/<page>.html, and the owner reviews the
   deployed site, never the local one. The two drifted: on 2026-07-30 the deployed
   copy was a day stale and had no ucluelet.html at all, so every Ucluelet link on
   the live site 404'd while the local copy was clean.
   Run this after any prototype edit, before committing.

   media/ is deliberately NOT synced. public/prototype/media holds resized images
   (96 MB against 274 MB of originals); overwriting them would triple what the
   repo ships. Add new images to both, optimised on the public side.

   Usage: node scripts/sync-prototype.mjs [--check] */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const FROM = 'design/prototype/', TO = 'public/prototype/';
const CHECK = process.argv.includes('--check');
const SKIP = ['media/', '_sweep.html']; // _sweep is a local contact sheet, not a page

const args = ['-a', ...(CHECK ? ['-n'] : []), '--itemize-changes',
  ...SKIP.flatMap((s) => ['--exclude', s]), FROM, TO];
const out = execFileSync('rsync', args, { encoding: 'utf8' })
  .split('\n').filter((l) => /^[>c]/.test(l));

for (const l of out) console.log('  ' + l);
console.log(`${out.length} file(s) ${CHECK ? 'would sync' : 'synced'} to ${TO}`);

/* Both copies must hold the same set of pages. A page that exists only in
   design/ is a page nobody can reach on the deployed site. */
const pages = (d) => new Set(readdirSync(d).filter((f) => f.endsWith('.html') && !SKIP.includes(f)));
const a = pages(FROM), b = pages(TO);
const missing = [...a].filter((f) => !b.has(f)), extra = [...b].filter((f) => !a.has(f));
if (missing.length) console.log(`  MISSING from the deployed copy: ${missing.join(', ')}`);
if (extra.length) console.log(`  ONLY in the deployed copy: ${extra.join(', ')}`);

/* Every local media reference has to resolve in the deployed copy too, or the
   page renders with holes on Vercel and looks fine locally. */
let broken = 0;
for (const f of b) {
  const s = readFileSync(TO + f, 'utf8');
  for (const [, src] of s.matchAll(/src="(media\/[^"]+)"/g)) {
    try { statSync(TO + src); } catch { broken++; console.log(`  ${f}: deployed copy is missing ${src}`); }
  }
}
const bad = missing.length + extra.length + broken;
console.log(bad ? `\n${bad} issue(s): the deployed copy does not match` : '\nthe deployed copy matches');
process.exit(bad ? 1 : 0);
