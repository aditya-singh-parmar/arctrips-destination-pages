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

/* Itinerary slugs, one page each. Keep in step with scripts/itineraries/build.py. */
const ITINERARIES = [
  '10-day-british-columbia-road-trip',
  '14-day-vancouver-island-and-mainland-bc-adventure',
  '3-day-okanagan-wine-country-getaway',
  '3-day-ucluelet-fishing-getaway',
  '3-day-whistler-mountain-biking-trip',
  '5-day-romantic-vancouver-island-getaway',
  '5-day-vancouver-island-fishing-road-trip',
  '5-day-vancouver-island-food-and-seafood-tour',
  '5-day-vancouver-island-wildlife-adventure',
  '5-day-whistler-ski-holiday',
  '7-day-family-road-trip-around-vancouver-island',
  '7-day-vancouver-island-hiking-trip',
  '9-day-british-columbia-outdoor-adventure',
  'five-days-in-the-okanagan',
  'five-days-of-vancouver-island-mountain-biking',
  'five-days-on-southern-vancouver-island',
  'five-days-on-vancouver-island',
  'four-days-on-the-west-coast',
  'nine-days-exploring-vancouver-island',
  'nine-days-in-vancouver-whistler-and-the-okanagan',
  'one-day-in-kelowna',
  'one-day-in-tofino',
  'one-day-in-ucluelet',
  'one-day-in-vancouver',
  'one-day-in-victoria',
  'one-day-in-whistler',
  'seven-days-from-victoria-to-ucluelet',
  'seven-days-in-the-okanagan',
  'seven-days-of-vancouver-island-mountain-biking',
  'seven-days-on-vancouver-island',
  'ten-days-from-victoria-to-ucluelet',
  'three-days-from-squamish-to-whistler',
  'three-days-in-the-okanagan',
  'three-days-in-tofino-and-ucluelet',
  'three-days-in-victoria-and-the-cowichan-valley',
  'three-days-in-whistler',
  'three-days-of-vancouver-island-mountain-biking',
  'three-days-on-southern-vancouver-island',
  'three-days-on-vancouver-island',
  'tofino-and-ucluelet-weekend-getaway',
  'two-days-at-the-pacific-rim-whale-festival',
  'two-days-from-squamish-to-whistler',
  'two-days-in-squamish',
  'two-days-in-the-okanagan',
  'two-days-in-vancouver',
  'two-days-in-victoria',
  'two-days-in-whistler',
  'two-days-on-the-west-coast',
  'two-weeks-in-british-columbia-coast-mountains-and-wine-country',
  'vancouver-and-whistler-in-five-days',
  'vancouver-to-tofino-and-ucluelet-7-day-road-trip',
  'vancouver-tofino-and-ucluelet-in-five-days',
  'vancouver-whistler-and-the-sea-to-sky-highway',
  'victoria-cowichan-valley-and-nanaimo',
  'victoria-to-ucluelet-7-day-island-adventure',
];

export const ROUTES = {
  /* British Columbia is the root of the content tree. PRD: URL Structure and Site
     Taxonomy (Confluence ADS 117735426), "the one rule":
     /{section}/{country}/{province}/{town}/{page-slug}. */
  'index.html': BC,
  'region.html': `${BC}/vancouver-island`,
  /* Review 2026-11-25: the Mainland region page, a sibling of Vancouver Island. */
  'mainland.html': `${BC}/mainland`,
  /* PRD section landing pages (section 7, "Must do"): every town by region, and
     the travel guides hub that replaces the search page behind the Guides tab. */
  'destinations.html': '/destinations',
  'guides.html': '/travel-guides',
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
  /* Review 2026-11-13: best time to visit, modelled on a conditions-by-month
     table, at the slug the reviewer asked for. A page slug under the town's
     travel guide, per the PRD's one rule. */
  'best-time-tofino.html': '/travel-guides/canada/bc/tofino/best-time-to-visit',

  /* Ucluelet */
  'ucluelet.html': `${BC}/ucluelet`,
  'hiking-ucluelet.html': `${BC}/ucluelet/things-to-do/hiking`,
  'restaurants-ucluelet.html': `${BC}/ucluelet/things-to-do/restaurants`,
  'whale-watching-ucluelet.html': '/whale-watching/canada/bc/ucluelet',
  /* Review 2026-11-25: fishing and storm watching are Ucluelet activities. */
  'fishing-ucluelet.html': '/fishing/canada/bc/ucluelet',
  'storm-watching-ucluelet.html': `${BC}/ucluelet/things-to-do/storm-watching`,
  'kayaking-ucluelet.html': '/kayaking/canada/bc/ucluelet',
  'best-time-ucluelet.html': '/travel-guides/canada/bc/ucluelet/best-time-to-visit',

  /* Suggested itineraries, 2 to 10 days, by town and by group of towns. They
     span several towns, so the page sits at province level in the travel-guides
     section (assumption, D-20). */
  'itineraries.html': '/travel-guides/canada/bc/itineraries',
  /* Review 2026-11-25: one page per itinerary (scripts/itineraries/build.py),
     under the province-level itineraries page (D-20, D-22). */
  ...Object.fromEntries(ITINERARIES.map((slug) => [`itinerary-${slug}.html`, `/travel-guides/canada/bc/itineraries/${slug}`])),

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
};

/* Extra URLs that serve a page without being its canonical address. Rewrites,
   not redirects (the PRD forbids redirects), and the page's canonical tag names
   the real route. The prototype's own root shows the British Columbia index.
   /destinations is its own page since review 2026-11-25. */
export const ALIASES = {
  '/': 'index.html',
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
