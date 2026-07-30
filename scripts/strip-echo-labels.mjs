/* Every section on the town pages printed its heading twice: once as an
   uppercase eyebrow label and once as the h2 directly beneath it, word for word.
   The label carried no information the h2 did not, so it goes.

   Only exact duplicates are removed. A label that says something different from
   its heading is doing a job and is left alone.

   Run: node scripts/strip-echo-labels.mjs [--check]
*/
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = 'design/prototype';
const CHECK = process.argv.includes('--check');
const norm = (s) => s.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase();

let removed = 0, kept = 0;
const touched = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.html'))) {
  const src = readFileSync(`${DIR}/${f}`, 'utf8');
  let n = 0;
  const out = src.replace(
    /<span class="label label--n">([^<]+)<\/span>(\s*)<h2>([^<]+)<\/h2>/g,
    (all, label, gap, heading) => {
      if (norm(label) !== norm(heading)) { kept++; return all; }
      n++; return `<h2>${heading}</h2>`;
    });
  if (n) { removed += n; touched.push(`${f} (${n})`); if (!CHECK) writeFileSync(`${DIR}/${f}`, out); }
}
for (const t of touched) console.log('  ' + t);
console.log(`${removed} echoed label(s) ${CHECK ? 'would be removed' : 'removed'}, ${kept} informative label(s) left alone`);
