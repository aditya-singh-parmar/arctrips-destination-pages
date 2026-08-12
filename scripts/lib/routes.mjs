/* The site's URL map, and the only place it is written down.
   next.config.ts, the QA gates, the nav generator and shots.mjs all read this.

   The pages are static files in public/prototype, but the URLs are a proper
   nested tree: a town owns its sections and its subjects. That also fixes three
   names that were global and shouldn't have been: things-to-do.html, plan.html
   and guide.html are Tofino's pages, not the site's.

   Underscore-prefixed files (_map.html, partials) are not routes. They stay
   reachable at /prototype/<file> for internal use.
*/

export const ROUTES = {
  'index.html': '/',
  'search.html': '/search',
  'region.html': '/vancouver-island',
  'not-found.html': '/not-found',

  'tofino.html': '/tofino',
  'things-to-do.html': '/tofino/things-to-do',
  'plan.html': '/tofino/plan',
  'guide.html': '/tofino/guides',
  'long-beach.html': '/tofino/long-beach',
  'beaches-tofino.html': '/tofino/beaches',
  'hiking-tofino.html': '/tofino/hiking',
  'kayaking-tofino.html': '/tofino/kayaking',
  'whale-watching.html': '/tofino/whale-watching',
  'storm-watching-tofino.html': '/tofino/storm-watching',
  'restaurants-tofino.html': '/tofino/restaurants',
  'surfing-tofino.html': '/tofino/surfing',
  'birding-tofino.html': '/tofino/birding',
  'fishing-tofino.html': '/tofino/fishing',

  'ucluelet.html': '/ucluelet',
  'hiking-ucluelet.html': '/ucluelet/hiking',
  'kayaking-ucluelet.html': '/ucluelet/kayaking',
  'whale-watching-ucluelet.html': '/ucluelet/whale-watching',
  'restaurants-ucluelet.html': '/ucluelet/restaurants',

  'banff.html': '/banff',
  'campbell-river.html': '/campbell-river',
  'charlottetown.html': '/charlottetown',
  'chemainus.html': '/chemainus',
  'edmonton.html': '/edmonton',
  'halifax.html': '/halifax',
  'jasper.html': '/jasper',
  'montreal.html': '/montreal',
  'nanaimo.html': '/nanaimo',
  'nanoose.html': '/nanoose',
  'nelson.html': '/nelson',
  'niagara-falls.html': '/niagara-falls',
  'ottawa.html': '/ottawa',
  'parksville.html': '/parksville',
  'quebec-city.html': '/quebec-city',
  'saskatoon.html': '/saskatoon',
  'shawnigan-lake.html': '/shawnigan-lake',
  'sidney.html': '/sidney',
  'sooke.html': '/sooke',
  'squamish.html': '/squamish',
  'st-john.html': '/st-john',
  'vancouver.html': '/vancouver',
  'victoria.html': '/victoria',
  'whistler.html': '/whistler',
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
