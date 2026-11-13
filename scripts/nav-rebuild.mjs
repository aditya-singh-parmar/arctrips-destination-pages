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

   2026-11-13 (D-21): every page now gets the two-line header written at the
   bottom of this file. Pages not in PAGES keep their own section links.

   Run: node scripts/nav-rebuild.mjs [--check]
*/
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { ROUTES } from './lib/routes.mjs';

/* The tables below name pages by file, because that is what is on disk. Every
   href they emit is the page's public route. */
const R = (h) => h.replace(/^([a-z0-9-]+\.html)/, (m) => ROUTES[m] || m);

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
    { key: 'best',      label: 'Best time to visit', href: 'best-time-tofino.html' },
    { key: 'trips',     label: 'Itineraries',  href: 'itineraries.html#west-coast' },
    { key: 'guides',    label: 'Guides',       href: 'guide.html' },
  ],
  /* Ucluelet has no plan or guide page of its own, and its subject index is a
     section of its town page. Offering tabs that lead to Tofino's pages is the
     defect this whole pass exists to remove, so the bar shows only what is real. */
  ucluelet: [
    { key: 'overview',  label: 'Overview',     href: 'ucluelet.html' },
    { key: 'why',       label: 'Why go',       href: 'ucluelet.html#overview' },
    { key: 'things',    label: 'Things to do', href: 'ucluelet.html#do' },
    { key: 'best',      label: 'Best time to visit', href: 'best-time-ucluelet.html' },
    { key: 'trips',     label: 'Itineraries',  href: 'itineraries.html#west-coast' },
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
const esc = (s) => s.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;');

/* ── The header, two lines on every page (reviewer, 2026-11-13) ──────────────
   Line 1 is the global nav. Under it, one sticky bar with two rows:
     row 2: the breadcrumb, British Columbia / Vancouver Island / Sidney
     row 3: the sections of the page you are on (a town's Overview, Why go,
            When to go, Things to do; on a subject page, its sibling subjects)
   The old back link, the separate in-body breadcrumb and the third subject
   rail are gone. The breadcrumb is read from the page itself (old in-body form
   or the bar this script already wrote), so every ancestor stays a real link. */
const SEP = '<span class="sep" aria-hidden="true">/</span>';
const BAR_RE = /<div class="placebar placebar--two"[\s\S]*?<!-- \/placebar -->/;
const OLD_BAR_RE = new RegExp(
  '<nav class="placebar"[\\s\\S]*?<\\/div>\\s*<\\/nav>' +
  '|<div class="placebar">\\s*<div class="wrap placebar-in">[\\s\\S]*?<\\/div>\\s*<\\/div>');
const RAIL_RE = /\s*<nav class="subjectbar"[\s\S]*?<\/nav>/;
const CRUMB_RE = /(<!--[^>]*-->\s*)?<nav[^>]*aria-label="Breadcrumb"[^>]*>[\s\S]*?<\/nav>/;

function readCrumbs(html) {
  const out = [];
  const re = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<(?:span|li)[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/(?:span|li)>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) out.push({ href: m[1], label: m[2].replace(/<[^>]+>/g, '').trim() });
    else out.push({ href: null, label: m[3].replace(/<[^>]+>/g, '').trim() });
  }
  return out;
}

function renderCrumbs(crumbs, id) {
  return crumbs.map((c, i) => {
    const deep = i < crumbs.length - 2 ? ' class="lvl-deep"' : '';
    const sep = i < crumbs.length - 1 ? (i < crumbs.length - 2 ? SEP.replace('class="sep"', 'class="sep lvl-deep"') : SEP) : '';
    return c.href ? `<a${deep} href="${c.href}">${esc(c.label)}</a>${sep}` : `<span aria-current="page">${esc(c.label)}</span>`;
  }).join('');
}

function render({ label, crumbs, links, ids = {} }) {
  const cid = ids.crumb ? ` id="${ids.crumb}"` : '';
  const lid = ids.links ? ` id="${ids.links}"` : '';
  const bid = ids.bar ? ` id="${ids.bar}"` : '';
  const extra = ids.extra || '';
  return `<div class="placebar placebar--two"${bid} aria-label="${esc(label)}"><div class="wrap">
  <nav class="crumb placebar__crumb"${cid} aria-label="Breadcrumb">${renderCrumbs(crumbs)}</nav>
  <nav class="placebar-in" aria-label="${esc(label)} sections"><ul class="placebar__links"${lid}>
${links}
  </ul>${extra}</nav>
</div></div><!-- /placebar -->`;
}

function linksFor(file, cfg) {
  if (cfg.subject) {
    return SUBJECTS[cfg.town].map((s) => {
      const current = cfg.subject === s.slug;
      const href = current ? '#top' : R(s.page);
      return `    <li><a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(s.label)}</a></li>`;
    }).join('\n');
  }
  return SECTIONS[cfg.town].map((s) => {
    const current = cfg.section === s.key;
    const href = current && s.href === cfg.self ? '#top' : R(s.href);
    return `    <li><a href="${href}"${current ? ' aria-current="page"' : ''}>${s.label}</a></li>`;
  }).join('\n');
}

let changed = 0; const missing = [];
const files = readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
for (const file of files) {
  const original = readFileSync(`${DIR}/${file}`, 'utf8');
  let src = original;
  let crumbs, links, label, ids = {};
  const cur = src.match(BAR_RE);
  if (cur) {
    crumbs = readCrumbs(cur[0].match(/<nav class="crumb placebar__crumb"[\s\S]*?<\/nav>/)[0]);
    links = cur[0].match(/<ul class="placebar__links"[^>]*>\n?([\s\S]*?)\n?\s*<\/ul>/)[1];
    label = cur[0].match(/aria-label="([^"]*)"/)[1];
    if (/placebar__crumb" id="crumb"/.test(cur[0])) ids.crumb = 'crumb';
    if (/id="pbLinks"/.test(cur[0])) ids.links = 'pbLinks';
    if (/placebar--two" id="placebar"/.test(cur[0])) ids.bar = 'placebar';
    const cta = cur[0].match(/\s*<a class="btn[^"]*nf-pbcta"[\s\S]*?<\/a>/);
    if (cta) ids.extra = cta[0];
  } else {
    const old = src.match(OLD_BAR_RE);
    if (!old) { if (file !== 'index.html') missing.push(`${file} (no placebar)`); else missing.push('index.html (no placebar)'); continue; }
    label = (old[0].match(/aria-label="([^"]*)"/) || [, file])[1];
    const rail = src.match(RAIL_RE);
    links = rail ? rail[0].match(/<ul class="subjectbar__links">\n?([\s\S]*?)\n?\s*<\/ul>/)[1].replace(/ data-soon/g, '')
                 : old[0].match(/<ul class="placebar__links"[^>]*>\n?([\s\S]*?)\n?\s*<\/ul>/)[1];
    const here = old[0].match(/<span class="placebar__here">([^<]*)<\/span>/);
    const body = src.slice(src.indexOf(old[0]) + old[0].length);
    const cm = body.match(CRUMB_RE);
    crumbs = cm ? readCrumbs(cm[0]) : [{ href: null, label: here ? here[1] : label }];
    if (cm && cm[0].includes('id="crumb"')) ids.crumb = 'crumb';
    if (/id="pbLinks"/.test(old[0])) ids.links = 'pbLinks';
    if (/id="placebar"/.test(old[0])) ids.bar = 'placebar';
    const cta = old[0].match(/\s*<a class="btn[^"]*nf-pbcta"[\s\S]*?<\/a>/);
    if (cta) ids.extra = cta[0];
    if (cm) {
      /* drop the in-body breadcrumb, and its wrapper when that is all it held */
      const wrapped = new RegExp('<div class="wrap">\\s*' + cm[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*</div>');
      src = wrapped.test(src) ? src.replace(wrapped, '') : src.replace(cm[0], '');
    }
    if (rail) src = src.replace(rail[0], '');
    src = src.replace(old[0], '@@BAR@@');
  }
  if (PAGES[file]) links = linksFor(file, PAGES[file]);
  if (crumbs.length && crumbs[0].label !== 'British Columbia') crumbs.unshift({ href: '/', label: 'British Columbia' });
  const bar = render({ label, crumbs, links, ids });
  const next = cur ? src.replace(cur[0], bar) : src.replace('@@BAR@@', bar);
  if (next !== original) { changed++; if (!CHECK) writeFileSync(`${DIR}/${file}`, next); console.log(`  ${file}`); }
}
if (missing.length) console.log('  MISSING: ' + missing.join(', '));
console.log(`${changed} page(s) ${CHECK ? 'would be rebuilt' : 'rebuilt'}${missing.length ? `, ${missing.length} problem(s)` : ''}`);
process.exit(missing.length ? 1 : 0);
