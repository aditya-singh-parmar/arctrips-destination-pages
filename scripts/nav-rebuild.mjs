/* Rebuilds the destination-tree navigation from one table, so every page in the
   tree carries the same bar rather than one of three hand-maintained dialects.

   Two defects it fixes, both reported by the owner on 2026-07-30:

   1. A subject page wedged its own name into the tab bar as a pseudo-tab and
      offered no siblings, so Kayaking could not reach Fishing without going up
      to the index and back down. Subjects now live in their own rail beneath
      the bar, which lists all of them.

   2. "Areas" sat in the bar as a peer of Things to do, Plan and Guides. An area
      is a child of the town, not a section of it, so it is out of the bar. Long
      Beach is reached from the town overview and from the subjects it contains.

   The bar now means exactly one thing everywhere: the town's sections.

   Run: node scripts/nav-rebuild.mjs [--check]
*/
import { readFileSync, writeFileSync } from 'fs';

const DIR = 'design/prototype';
const CHECK = process.argv.includes('--check');

/* Every subject in each town, in the order the index shows them. `page: null`
   means no page was built, so the chip points at that subject's card in the
   index. Slugs match the ids things-to-do.html writes on its cards. */
const SUBJECTS = {
  tofino: [
    { slug: 'beaches',        label: 'Beaches',            page: 'beaches-tofino.html' },
    { slug: 'hiking',         label: 'Hiking & trails',    page: 'hiking-tofino.html' },
    { slug: 'kayaking',       label: 'Kayaking',           page: 'kayaking-tofino.html' },
    { slug: 'whale-watching', label: 'Whale watching',     page: 'whale-watching.html' },
    { slug: 'storm-watching', label: 'Storm watching',     page: 'storm-watching-tofino.html' },
    { slug: 'restaurants',    label: 'Restaurants',        page: 'restaurants-tofino.html' },
    { slug: 'surfing',        label: 'Surfing',            page: 'surfing-tofino.html' },
    { slug: 'birding',        label: 'Birding',            page: 'birding-tofino.html' },
    { slug: 'fishing',        label: 'Fishing',            page: 'fishing-tofino.html' },
  ],
  ucluelet: [
    { slug: 'hiking',         label: 'Hiking & trails',    page: 'hiking-ucluelet.html' },
    { slug: 'kayaking',       label: 'Kayaking',           page: 'kayaking-ucluelet.html' },
    { slug: 'whale-watching', label: 'Whale watching',     page: 'whale-watching-ucluelet.html' },
    { slug: 'restaurants',    label: 'Restaurants',        page: 'restaurants-ucluelet.html' },
  ],
};

/* The town's sections. Areas is deliberately absent. */
const SECTIONS = {
  tofino: [
    { key: 'overview',  label: 'Overview',     href: 'tofino.html' },
    { key: 'things',    label: 'Things to do', href: 'things-to-do.html' },
    { key: 'plan',      label: 'Plan',         href: 'plan.html' },
    { key: 'guides',    label: 'Guides',       href: 'guide.html' },
  ],
  /* Ucluelet has no plan or guide page of its own, and its subject index is a
     section of its town page. Offering tabs that lead to Tofino's pages is the
     defect this whole pass exists to remove, so the bar shows only what is real. */
  ucluelet: [
    { key: 'overview',  label: 'Overview',     href: 'ucluelet.html' },
    { key: 'things',    label: 'Things to do', href: 'ucluelet.html#do' },
  ],
};

/* page -> { town, section, subject, back } */
const PAGES = {
  'tofino.html':                { town: 'tofino',   section: 'overview', self: 'tofino.html',   back: ['region.html', 'Vancouver Island'] },
  'things-to-do.html':          { town: 'tofino',   section: 'things',   self: 'things-to-do.html', back: ['tofino.html', 'Tofino'], rail: true },
  'plan.html':                  { town: 'tofino',   section: 'plan',     self: 'plan.html',     back: ['tofino.html', 'Tofino'] },
  'guide.html':                 { town: 'tofino',   section: 'guides',   self: 'guide.html',    back: ['tofino.html', 'Tofino'] },
  'long-beach.html':            { town: 'tofino',   section: null,       self: 'long-beach.html', back: ['tofino.html', 'Tofino'], area: 'Long Beach' },

  'beaches-tofino.html':        { town: 'tofino',   section: 'things', subject: 'beaches',        back: ['things-to-do.html', 'Things to do in Tofino'] },
  'hiking-tofino.html':         { town: 'tofino',   section: 'things', subject: 'hiking',         back: ['things-to-do.html', 'Things to do in Tofino'] },
  'kayaking-tofino.html':       { town: 'tofino',   section: 'things', subject: 'kayaking',       back: ['things-to-do.html', 'Things to do in Tofino'] },
  'whale-watching.html':        { town: 'tofino',   section: 'things', subject: 'whale-watching', back: ['things-to-do.html', 'Things to do in Tofino'] },
  'storm-watching-tofino.html': { town: 'tofino',   section: 'things', subject: 'storm-watching', back: ['things-to-do.html', 'Things to do in Tofino'] },
  'restaurants-tofino.html':    { town: 'tofino',   section: 'things', subject: 'restaurants',    back: ['things-to-do.html', 'Things to do in Tofino'] },
  'surfing-tofino.html':        { town: 'tofino',   section: 'things', subject: 'surfing',        back: ['things-to-do.html', 'Things to do in Tofino'] },
  'birding-tofino.html':        { town: 'tofino',   section: 'things', subject: 'birding',        back: ['things-to-do.html', 'Things to do in Tofino'] },
  'fishing-tofino.html':        { town: 'tofino',   section: 'things', subject: 'fishing',        back: ['things-to-do.html', 'Things to do in Tofino'] },

  'ucluelet.html':              { town: 'ucluelet', section: 'overview', self: 'ucluelet.html', back: ['region.html', 'Vancouver Island'], rail: true },
  'hiking-ucluelet.html':       { town: 'ucluelet', section: 'things', subject: 'hiking',         back: ['ucluelet.html', 'Ucluelet'] },
  'kayaking-ucluelet.html':     { town: 'ucluelet', section: 'things', subject: 'kayaking',       back: ['ucluelet.html', 'Ucluelet'] },
  'whale-watching-ucluelet.html': { town: 'ucluelet', section: 'things', subject: 'whale-watching', back: ['ucluelet.html', 'Ucluelet'] },
  'restaurants-ucluelet.html':  { town: 'ucluelet', section: 'things', subject: 'restaurants',    back: ['ucluelet.html', 'Ucluelet'] },
};

const TOWN_NAME = { tofino: 'Tofino', ucluelet: 'Ucluelet' };
const esc = (s) => s.replace(/&/g, '&amp;');

function bar(file, cfg) {
  const town = TOWN_NAME[cfg.town];
  const [backHref, backLabel] = cfg.back;
  const tabs = SECTIONS[cfg.town].map((s) => {
    const current = cfg.section === s.key;
    /* the tab for the page you are on is an in-page anchor, never a self-reload */
    const href = current && s.href === cfg.self ? '#top' : s.href;
    return `    <li><a href="${href}"${current ? ' aria-current="page"' : ''}>${s.label}</a></li>`;
  }).join('\n');

  let out = `<nav class="placebar" aria-label="${town}"><div class="wrap placebar-in">
  <a class="placebar__back" href="${backHref}"><span class="n">&larr; ${esc(backLabel)}</span></a>
  <ul class="placebar__links">
${tabs}
  </ul>
  <a class="btn btn--primary btn--sm placebar__cta" href="search.html?in=${cfg.town}">Find a stay</a>
</div></nav>`;

  /* The subject rail: on every subject page, and on the two indexes that list
     subjects, so the lateral move is available from the index too. */
  if (cfg.subject || cfg.rail) {
    const chips = SUBJECTS[cfg.town].map((s) => {
      const current = cfg.subject === s.slug;
      const href = current ? '#top'
        : s.page ? s.page
        : cfg.town === 'tofino' ? `things-to-do.html#${s.slug}` : 'ucluelet.html#do';
      return `    <li><a href="${href}"${current ? ' aria-current="page"' : ''}${s.page ? '' : ' data-soon'}>${esc(s.label)}</a></li>`;
    }).join('\n');
    out += `\n<nav class="subjectbar" aria-label="Things to do in ${town}"><div class="wrap subjectbar-in">
  <span class="subjectbar__l">Things to do</span>
  <ul class="subjectbar__links">
${chips}
  </ul>
</div></nav>`;
  }
  return out;
}

let changed = 0, missing = [];
for (const [file, cfg] of Object.entries(PAGES)) {
  let original;
  try { original = readFileSync(`${DIR}/${file}`, 'utf8'); } catch { missing.push(file); continue; }
  let src = original;
  /* Replace the existing bar, plus any rail a previous run emitted. Some pages
     wrapped it in <div>, some in <nav>, and the <div> ones nested the wrap on
     its own line; all of them come out as one <nav> landmark. */
  const re = new RegExp(
    '<nav class="placebar"[\\s\\S]*?<\\/nav>' +
    '|<div class="placebar">\\s*<div class="wrap placebar-in">[\\s\\S]*?<\\/div>\\s*<\\/div>' +
    '|<div class="placebar"><div class="wrap placebar-in">[\\s\\S]*?<\\/div><\\/div>'
  );
  const railRe = /\s*<nav class="subjectbar"[\s\S]*?<\/nav>/;
  if (!re.test(src)) { missing.push(`${file} (no placebar found)`); continue; }
  src = src.replace(railRe, '');
  const next = src.replace(re, bar(file, cfg));
  /* compare against the file on disk, not the copy the rail-strip already
     mutated, or --check reports every page as changed on a clean tree */
  if (next !== original) { changed++; if (!CHECK) writeFileSync(`${DIR}/${file}`, next); console.log(`  ${file}`); }
}
if (missing.length) console.log('  MISSING: ' + missing.join(', '));
console.log(`${changed} page(s) ${CHECK ? 'would be rebuilt' : 'rebuilt'}${missing.length ? `, ${missing.length} problem(s)` : ''}`);
process.exit(missing.length ? 1 : 0);
