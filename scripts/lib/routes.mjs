/* The site's URL map, and the only place it is written down.
   next.config.ts, the QA gates, the nav generator, the canonical generator,
   sitemap.ts and robots.ts all read this.

   The pages are static files in public/prototype, served at the PRD's URLs by
   rewrites. The PRD is Confluence ADS 117735426 "PRD: URL Structure & Site
   Taxonomy". Underscore-prefixed files (_map.html, partials) are not routes.
   They stay reachable at /prototype/<file> for internal use.
*/

const BC = '/destinations/canada/bc';
const PROV = (prov, town) => `/destinations/canada/${prov}/${town}`;

export const ROUTES = {
  /* British Columbia is the root of the content tree. PRD: URL Structure and Site
     Taxonomy (Confluence ADS 117735426), "the one rule":
     /{section}/{country}/{province}/{town}/{page-slug}. */
  'index.html': BC,
  'region.html': `${BC}/vancouver-island`,
  'search.html': '/search',
  'not-found.html': '/not-found',

  /* Tofino */
  'tofino.html': `${BC}/tofino`,
  'things-to-do.html': `${BC}/tofino/things-to-do`,
  'long-beach.html': `${BC}/tofino/long-beach`,
  'beaches-tofino.html': `${BC}/tofino/things-to-do/beaches`,
  'hiking-tofino.html': `${BC}/tofino/things-to-do/hiking`,
  'storm-watching-tofino.html': `${BC}/tofino/things-to-do/storm-watching`,
  'restaurants-tofino.html': `${BC}/tofino/things-to-do/restaurants`,
  'surfing-tofino.html': `${BC}/tofino/things-to-do/surfing`,
  'birding-tofino.html': `${BC}/tofino/things-to-do/birding`,
  /* The three bookable verticals own a PRD section of their own. */
  'whale-watching.html': '/whale-watching/canada/bc/tofino',
  'kayaking-tofino.html': '/kayaking/canada/bc/tofino',
  'fishing-tofino.html': '/fishing/canada/bc/tofino',
  /* Travel guide and blog patterns from the PRD. */
  'plan.html': '/travel-guides/canada/bc/tofino',
  'guide.html': '/blog/whale-watching/canada/bc/tofino/wildlife-tours-in-tofino',

  /* Ucluelet */
  'ucluelet.html': `${BC}/ucluelet`,
  'hiking-ucluelet.html': `${BC}/ucluelet/things-to-do/hiking`,
  'restaurants-ucluelet.html': `${BC}/ucluelet/things-to-do/restaurants`,
  'whale-watching-ucluelet.html': '/whale-watching/canada/bc/ucluelet',
  'kayaking-ucluelet.html': '/kayaking/canada/bc/ucluelet',

  /* The other thirteen BC towns */
  'victoria.html': `${BC}/victoria`,
  'vancouver.html': `${BC}/vancouver`,
  'whistler.html': `${BC}/whistler`,
  'squamish.html': `${BC}/squamish`,
  'sooke.html': `${BC}/sooke`,
  'sidney.html': `${BC}/sidney`,
  'chemainus.html': `${BC}/chemainus`,
  'nanaimo.html': `${BC}/nanaimo`,
  'nanoose.html': `${BC}/nanoose`,
  'parksville.html': `${BC}/parksville`,
  'shawnigan-lake.html': `${BC}/shawnigan-lake`,
  'campbell-river.html': `${BC}/campbell-river`,
  'nelson.html': `${BC}/nelson`,

  /* Elsewhere in Canada: the province segment is the postal abbreviation, as in
     the PRD's "bc". */
  'banff.html': PROV('ab', 'banff'),
  'jasper.html': PROV('ab', 'jasper'),
  'edmonton.html': PROV('ab', 'edmonton'),
  'saskatoon.html': PROV('sk', 'saskatoon'),
  'niagara-falls.html': PROV('on', 'niagara-falls'),
  'ottawa.html': PROV('on', 'ottawa'),
  'montreal.html': PROV('qc', 'montreal'),
  'quebec-city.html': PROV('qc', 'quebec-city'),
  'halifax.html': PROV('ns', 'halifax'),
  'charlottetown.html': PROV('pe', 'charlottetown'),
  'st-john.html': PROV('nl', 'st-john'), // St. John's, Newfoundland and Labrador
};

/* Extra URLs that serve a page without being its canonical address. Rewrites,
   not redirects (the PRD forbids redirects), and the page's canonical tag names
   the real route. The prototype's own root and the PRD's /destinations section
   both show the British Columbia index until the real build gives each its own
   page. */
export const ALIASES = {
  '/': 'index.html',
  '/destinations': 'index.html',
};

/* route -> file, for the QA gates that have to resolve a link back to disk */
export const FILE_FOR = Object.fromEntries(
  Object.entries(ROUTES).map(([file, route]) => [route, file]),
);

/* Where the static files actually live, under public/. */
export const STATIC_PREFIX = '/prototype';

export const fileToPath = (file) => `${STATIC_PREFIX}/${file}`;

/* Longest first, so whale-watching-ucluelet.html is not eaten by
   whale-watching.html when rewriting link text. */
export const FILES_BY_LENGTH = Object.keys(ROUTES).sort((a, b) => b.length - a.length);

/* The public origin. Canonical tags, sitemap.xml and robots.txt are all built
   from this and ROUTES, so a domain cutover is this one line plus
   `node scripts/canonical-rebuild.mjs`. ASSUMPTION: no custom domain exists
   yet, so this is the Vercel production URL. */
export const SITE_ORIGIN = 'https://arctrips-destination-pages.vercel.app';

/* Absolute canonical URL for a route. Never a trailing slash (PRD: URL Structure and Site Taxonomy, section 7). */
export const canonicalFor = (route) => (route === '/' ? SITE_ORIGIN : `${SITE_ORIGIN}${route}`);

/* Routes that must never be indexed or listed in the sitemap. */
export const NOINDEX_ROUTES = ['/not-found'];
