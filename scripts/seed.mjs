/**
 * Seed the Supabase tables to match the landing page's SEED_* content, plus
 * the v1.1 tree (regions, categories, city_categories, product_lines,
 * category_products, experiences). Prereq: apply supabase/migrations/0001 and
 * 0002 first.
 * Run: node --env-file=.env.local scripts/seed.mjs
 * Uses the service-role key (bypasses RLS). Idempotent (delete then insert).
 *
 * Scripts are plain JS (no TS loader), so the values below are duplicated
 * from app/lib/content.ts and app/lib/taxonomy.ts rather than imported.
 * Keep them in sync.
 *
 * NOTE: this wipes and re-seeds city_categories/places/photos/experiences,
 * so re-run scripts/ingest-articles.mjs after this to refill ingested bodies.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const IMG = {
  hero: "arcstudio/jhrn4nwfk4vsnvtqwkvz",
  coast: "arcstudio/wnrrcrf4lnalgzbjvsz8",
  aerial: "arcstudio/dtz692xbgvvwjopu7vcs",
  cabinExterior: "arcstudio/njajgzfo6gdfxbpxmtst",
  cabinInterior: "andrea-davis-44f42VRbGQg-unsplash_q9h9op",
  curatedCabin: "arc-trips/curated-cabin",
  gallery1: "arcstudio/mg8epie7gzlpfb1bn7jo",
  gallery2: "arcstudio/zczetpngmabknruslfwn",
  dayhike: "arcstudio/galleries/dayhike-trail-1",
  connection: "arc-trips/pillar-connection",
  founding: "arc-trips/founding-key",
  beach: "james-wheeler-YZfDg2L0lUs-unsplash_ino74q",
  surf: "nicoline-mann-bIIK4mvsDZc-unsplash_vcyrwx",
  kayak: "condor-wei-TiLEEXohfsY-unsplash_v7ja5f",
  seaplane: "thomas-lipke-M12HGHNVJ2s-unsplash_nttcvc",
};

const tofinoOverview = [
  "Tofino sits at the western edge of Vancouver Island, where the rainforest meets long stretches of open Pacific beach. It draws surfers, storm-watchers, and travelers looking for quiet time close to the water.",
  "Plan around the tides and the seasons. Summer brings calm mornings and warm evenings on the sand, while winter delivers dramatic storm-watching and empty beaches. Whatever the season, the pace here rewards staying a few nights rather than passing through.",
];
const uclueletOverview = [
  "Ucluelet sits at the tip of the peninsula south of Tofino, wrapped by the Wild Pacific Trail. It keeps a working-harbour character and tends to feel calmer than its better-known neighbour.",
  "It makes a natural base for whale watching, wildlife tours, and long coastal walks, with easy access to Pacific Rim National Park just up the road.",
];

/* ── Every town the corpus covers ─────────────────────────────────────────
   One row per city named in scripts/proposed-map.json, so the 73-document
   ingest has a destination to attach to and `destinations.slug` foreign keys
   (places, photos, city_categories, experiences) resolve.

   `standfirst` and `overview` here are deliberately plain placeholders: a
   destination page only renders when `standfirst` is set (app/lib/content.ts
   getCity falls back to SEED otherwise), so a city must not 404 in the window
   between seeding and ingest. scripts/ingest-articles.mjs replaces both with
   the real copy from that town's hub document. Nothing here makes a factual
   claim that the corpus does not. */
const CORPUS_CITIES = [
  // Vancouver Island. Tofino and Ucluelet are declared above with full content.
  { slug: "victoria",       name: "Victoria",       province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "nanaimo",        name: "Nanaimo",        province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "sooke",          name: "Sooke",          province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "sidney",         name: "Sidney",         province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "chemainus",      name: "Chemainus",      province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "shawnigan-lake", name: "Shawnigan Lake", province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "nanoose-bay",    name: "Nanoose Bay",    province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "parksville",     name: "Parksville",     province: "British Columbia", region_slug: "vancouver-island" },
  { slug: "campbell-river", name: "Campbell River", province: "British Columbia", region_slug: "vancouver-island" },
  // Sea to Sky.
  { slug: "squamish",       name: "Squamish",       province: "British Columbia", region_slug: "sea-to-sky" },
  { slug: "whistler",       name: "Whistler",       province: "British Columbia", region_slug: "sea-to-sky" },
  // Rest of British Columbia.
  { slug: "vancouver",      name: "Vancouver",      province: "British Columbia", region_slug: "bc" },
  { slug: "nelson",         name: "Nelson",         province: "British Columbia", region_slug: "bc" },
  // Alberta.
  { slug: "banff",          name: "Banff",          province: "Alberta" },
  { slug: "jasper",         name: "Jasper",         province: "Alberta" },
  { slug: "edmonton",       name: "Edmonton",       province: "Alberta" },
  // Ontario.
  { slug: "ottawa",         name: "Ottawa",         province: "Ontario" },
  { slug: "niagara-falls",  name: "Niagara Falls",  province: "Ontario" },
  // Quebec.
  { slug: "montreal",       name: "Montreal",       province: "Quebec" },
  { slug: "quebec-city",    name: "Quebec City",    province: "Quebec" },
  // Atlantic and prairie.
  { slug: "halifax",        name: "Halifax",        province: "Nova Scotia" },
  { slug: "st-johns",       name: "St. John's",     province: "Newfoundland and Labrador" },
  { slug: "charlottetown",  name: "Charlottetown",  province: "Prince Edward Island" },
  { slug: "saskatoon",      name: "Saskatoon",      province: "Saskatchewan" },
];

function corpusCities() {
  return CORPUS_CITIES.map((c, i) => ({
    slug: c.slug, name: c.name, region: c.province, region_slug: c.region_slug ?? null,
    hero_public_id: null, listing_count: 0, coming_soon: false, sort_order: 100 + i,
    standfirst: `Guides, things to do, and places to stay in ${c.name}, ${c.province}.`,
    overview: [`Arc Trips covers ${c.name} across the guides below. Browse what there is to do, then find a stay.`],
    things: [], gallery: [],
  }));
}

const destinations = [
  { slug: "tofino", name: "Tofino", region: "British Columbia", region_slug: "vancouver-island", hero_public_id: IMG.coast, listing_count: 134, coming_soon: false, sort_order: 0,
    standfirst: "Storm-swept beaches, old-growth rainforest, and the best surf on the Pacific coast.", overview: tofinoOverview,
    things: [
      { label: "Beaches", heroPublicId: IMG.coast, blurb: "Long Beach, Cox Bay, Chesterman." },
      { label: "Surfing", heroPublicId: IMG.surf, blurb: "Canada's surf capital." },
      { label: "Kayaking", heroPublicId: IMG.kayak, blurb: "Paddle Clayoquot Sound." },
      { label: "Wildlife tours", heroPublicId: IMG.seaplane, blurb: "Whales, bears, seabirds." },
    ],
    gallery: [IMG.coast, IMG.aerial, IMG.surf, IMG.kayak, IMG.dayhike, IMG.beach] },
  { slug: "ucluelet", name: "Ucluelet", region: "British Columbia", region_slug: "vancouver-island", hero_public_id: IMG.aerial, listing_count: 158, coming_soon: false, sort_order: 1,
    standfirst: "Tofino's quieter neighbour, wrapped by the Wild Pacific Trail.", overview: uclueletOverview,
    things: [
      { label: "Wild Pacific Trail", heroPublicId: IMG.dayhike, blurb: "The coastal walk people return for." },
      { label: "Kayaking", heroPublicId: IMG.kayak, blurb: "Sheltered launches and open water." },
      { label: "Wildlife watching", heroPublicId: IMG.beach, blurb: "Whales, sea lions, seabirds." },
      { label: "Restaurants", heroPublicId: IMG.gallery1, blurb: "Chowder and fresh catch." },
    ],
    gallery: [IMG.aerial, IMG.coast, IMG.beach, IMG.dayhike, IMG.gallery2, IMG.kayak] },
  { slug: "toronto", name: "Toronto", region: "Ontario", hero_public_id: IMG.beach, listing_count: 0, coming_soon: false, sort_order: 2 },
  ...corpusCities(),
];

// Legacy single-city articles (Phase 2). city_slugs added so getArticlesForCity
// (the v1.1 tree read) also matches these until Task 11 retires the old route.
const legacyArticles = [
  { slug: "tofino-beaches", destination_slug: "tofino", city_slugs: ["tofino"], title: "The Best Beaches in Tofino", category: "Beaches", category_slug: "beaches", hero_public_id: IMG.coast, excerpt: "Long Beach, Cox Bay, Chesterman: where to find surf, sand, and sunset walks.", sort_order: 0 },
  { slug: "tofino-surfing", destination_slug: "tofino", city_slugs: ["tofino"], title: "Surfing in Tofino", category: "Surfing", category_slug: "surfing", hero_public_id: IMG.surf, excerpt: "Canada's surf capital: breaks, seasons, and where to rent a board.", sort_order: 1 },
  { slug: "tofino-kayaking", destination_slug: "tofino", city_slugs: ["tofino"], title: "Kayaking in Tofino", category: "On the water", category_slug: "kayaking", hero_public_id: IMG.kayak, excerpt: "Paddle Clayoquot Sound past islands, inlets, and old-growth shoreline.", sort_order: 2 },
  { slug: "tofino-storm-watching", destination_slug: "tofino", city_slugs: ["tofino"], title: "Storm Watching in Tofino", category: "Seasonal", category_slug: "storm-watching", hero_public_id: IMG.aerial, excerpt: "Why winter is the dramatic season on the exposed Pacific coast.", sort_order: 3 },
  { slug: "tofino-wildlife-tours", destination_slug: "tofino", city_slugs: ["tofino"], title: "Wildlife Tours in Tofino", category: "Wildlife", category_slug: "whale-watching", hero_public_id: IMG.seaplane, excerpt: "Whales, bears, and seabirds: the tours worth booking.", sort_order: 4 },
  { slug: "tofino-restaurants", destination_slug: "tofino", city_slugs: ["tofino"], title: "Where to Eat in Tofino", category: "Food & drink", category_slug: "restaurants", hero_public_id: IMG.connection, excerpt: "From fish tacos to tasting menus, the town's essential tables.", sort_order: 5 },
  { slug: "ucluelet-hiking", destination_slug: "ucluelet", city_slugs: ["ucluelet"], title: "Ucluelet Hiking Guide", category: "Trails", category_slug: "hiking", hero_public_id: IMG.dayhike, excerpt: "The Wild Pacific Trail and the routes that make Ucluelet worth the drive.", sort_order: 0 },
  { slug: "ucluelet-kayaking", destination_slug: "ucluelet", city_slugs: ["ucluelet"], title: "Kayaking in Ucluelet", category: "On the water", category_slug: "kayaking", hero_public_id: IMG.kayak, excerpt: "Sheltered launches and open-water paddles from the harbour town.", sort_order: 1 },
  { slug: "ucluelet-wildlife-watching", destination_slug: "ucluelet", city_slugs: ["ucluelet"], title: "Wildlife Watching in Ucluelet", category: "Wildlife", category_slug: "whale-watching", hero_public_id: IMG.beach, excerpt: "Grey whales on migration, sea lions, and the spring seabird return.", sort_order: 2 },
  { slug: "ucluelet-restaurants", destination_slug: "ucluelet", city_slugs: ["ucluelet"], title: "Ucluelet Restaurants", category: "Food & drink", category_slug: "restaurants", hero_public_id: IMG.gallery1, excerpt: "Chowder, fresh catch, and the town's easy-going local rooms.", sort_order: 3 },
];

// v1.1 tree: articles that stay whole (not category-shaped), some spanning both towns.
// Placeholder title/excerpt here; scripts/ingest-articles.mjs overwrites title/body/excerpt/faqs on ingest.
const treeArticles = [
  { slug: "pacific-rim-whale-festival-guide", destination_slug: "tofino", city_slugs: ["tofino", "ucluelet"], category_slug: "events", title: "Pacific Rim Whale Festival Guide", category: "Events & festivals", hero_public_id: IMG.aerial, excerpt: "The spring festival that marks the gray whale migration through Clayoquot Sound.", sort_order: 10 },
  { slug: "whale-tails-blows-and-backs", destination_slug: "tofino", city_slugs: ["tofino", "ucluelet"], category_slug: "whale-watching", title: "Whale Tails, Blows, and Backs", category: "Whale watching", hero_public_id: IMG.aerial, excerpt: "What you're actually seeing on the water.", sort_order: 13 },
  { slug: "how-to-choose-a-vacation-rental", destination_slug: null, city_slugs: [], region_slug: "vancouver-island", category_slug: "when-to-go", title: "How to Choose a Vacation Rental on Vancouver Island", category: "When to go", hero_public_id: IMG.cabinExterior, excerpt: "What to check before you book.", sort_order: 14 },
  // Five documents that used to be seeded as whole articles are no longer
  // article-shaped in the reviewed corpus map: Best Time to Stay and the three
  // Ucluelet whale documents are now city+category content, and Campgrounds is
  // the tofino/camping category page. Seeding empty rows for them would leave
  // five bodyless articles in the index, so they are gone from here and
  // scripts/ingest-articles.mjs writes them to their real homes instead.
];

const articles = [...legacyArticles, ...treeArticles];

const CARD = [IMG.cabinExterior, IMG.curatedCabin, IMG.cabinInterior, IMG.gallery1, IMG.gallery2, IMG.dayhike, IMG.connection, IMG.founding, IMG.coast];
const L = (i, o) => ({
  id: `seed-${i}`, title: "Riverside Cabin Retreat with Hot Tub & Forest Views", location: "Canmore, Alberta",
  destination_slug: "tofino", hero_public_id: CARD[i % CARD.length], price_per_night: 420, currency: "CAD",
  rooms: 2, beds: 3, baths: 2, rating: 4.9, guest_favorite: false, is_holiday: false, ...o,
});
const listings = [
  L(0, {}), L(1, { title: "Coastal Bed-Cliff Cottage with Private Beach & Firepit" }),
  L(2, { destination_slug: "tofino", location: "Tofino, British Columbia" }),
  L(3, { destination_slug: "tofino", location: "Tofino, British Columbia" }),
  L(4, { destination_slug: "tofino", location: "Tofino, British Columbia", title: "Cozy Mountain Chalet with Sauna, Fireplace & Trails Nearby", price_per_night: 320 }),
  L(5, { destination_slug: "tofino", location: "Tofino, British Columbia", title: "Lakefront Cottage with Private Dock & Canoes Included", price_per_night: 500 }),
  L(6, { destination_slug: "ucluelet", location: "Ucluelet, British Columbia", title: "Alpine Timber Chalet with Mountain Hot Tub & Stargazing Deck", price_per_night: 385 }),
  L(7, { destination_slug: "ucluelet", location: "Ucluelet, British Columbia", title: "Modern Lakeside Villa with Rooftop Lounge & Marina Access", price_per_night: 450 }),
  L(8, { destination_slug: "ucluelet", location: "Ucluelet, British Columbia", title: "Historic Old-Town Loft with Stone Walls & River Views", price_per_night: 320 }),
  L(9, { guest_favorite: true, is_holiday: true }), L(10, { guest_favorite: true, is_holiday: true }), L(11, { guest_favorite: true, is_holiday: true }),
];

const reviews = [
  { id: "r1", author_name: "Marilyn Moses", author_initial: "M", avatar_color: "#D4C4AF", dated: "Jul 2024", sort_order: 0, is_video: false, is_featured: false, body: "Thanks for a great fishing trip! Ray was fun to be with and a very knowledgeable and experienced fishing guide. He was a huge help while I was bringing in the big salmon. The overnight accommodations you arranged were great. When not fishing, we really enjoyed walking the Wild Pacific Trail, browsing the little shops, and sampling the restaurants." },
  { id: "r2", author_name: "Rachel B.", author_initial: "R", avatar_color: "#F6B7C5", dated: "Aug 2024", sort_order: 1, is_video: false, is_featured: false, body: "Hi Sam, I have to say we all had a wonderful time. You have a jewel in Dan the chef here he was the greatest! He did so much for us and I am very appreciative of his ongoing extra mile for us. Thanks, Well be in touch again." },
  { id: "r3", author_name: "Sophia L.", author_initial: "S", avatar_color: "#D4C4AF", dated: "Jul 2024", sort_order: 2, is_video: false, is_featured: false, body: "We absolutely loved our stay! The home was spotless, beautifully furnished, and felt incredibly welcoming from the moment we walked in." },
  { id: "r4", author_name: "Brent M.", author_initial: "B", avatar_color: "#E8F4F0", dated: "Aug 2025", sort_order: 3, is_video: false, is_featured: false, body: "Such a beautiful property! The decor felt premium yet cozy, and the kitchen was fully stocked for cooking meals at home. We loved how close we were to trails and small cafes. It genuinely felt like a home away from home. Highly recommend staying here, you won't regret it!" },
  { id: "r5", author_name: "Daniel T.", author_initial: "D", avatar_color: "#2F7D64", dated: "Aug 2025", sort_order: 4, is_video: true, is_featured: true, media_public_id: IMG.aerial, body: "The guides were top-notch, knew the tides and got us on fish within an hour." },
  { id: "r6", author_name: "Amelia C.", author_initial: "A", avatar_color: "#E8F4F0", dated: "Aug 2025", sort_order: 5, is_video: false, is_featured: false, body: "Beautiful, clean, and cozy stay. Everything felt premium and thoughtfully prepared. Highly recommend!" },
];

/* ── v1.1 tree seed: duplicated from app/lib/taxonomy.ts, keep in sync ────── */

// `regions` is the v1.1 region table that `destinations.region_slug` and
// `articles.region_slug` point at. The corpus' cross-city roundups are scoped
// to one of these two, so both must exist before ingest or the foreign key
// rejects the row.
const regions = [
  { slug: "vancouver-island", name: "Vancouver Island", hero_public_id: IMG.coast,
    blurb: "Rainforest, surf beaches, and whale-watching water on Canada's Pacific coast.", sort_order: 0 },
  { slug: "sea-to-sky", name: "Sea to Sky", hero_public_id: IMG.dayhike,
    blurb: "The corridor from Squamish to Whistler: granite walls, bike parks, and alpine trails.", sort_order: 10 },
  { slug: "bc", name: "British Columbia", hero_public_id: IMG.aerial,
    blurb: "Coast, mountains and interior lakes across Canada's westernmost province.", sort_order: 20 },
];

const categories = [
  { slug: "beaches",         name: "Beaches",                  theme: "on-the-water",      sort_order: 10 },
  { slug: "surfing",         name: "Surfing",                  theme: "on-the-water",      sort_order: 20 },
  { slug: "kayaking",        name: "Kayaking & paddling",      theme: "on-the-water",      sort_order: 30 },
  { slug: "fishing",         name: "Fishing",                  theme: "on-the-water",      sort_order: 40 },
  { slug: "boating",         name: "Boating & sailing",        theme: "on-the-water",      sort_order: 50 },
  { slug: "hot-springs",     name: "Hot springs",              theme: "on-the-water",      sort_order: 60 },
  { slug: "whale-watching",  name: "Whale watching",           theme: "wildlife-nature",   sort_order: 70 },
  { slug: "birding",         name: "Birding & wildlife",       theme: "wildlife-nature",   sort_order: 80 },
  { slug: "storm-watching",  name: "Storm watching",           theme: "wildlife-nature",   sort_order: 90 },
  { slug: "parks",           name: "Parks & rainforest",       theme: "wildlife-nature",   sort_order: 100 },
  { slug: "hiking",          name: "Hiking & trails",          theme: "on-land",           sort_order: 110 },
  { slug: "mountain-biking", name: "Mountain biking",          theme: "on-land",           sort_order: 120 },
  { slug: "skiing",          name: "Skiing & snowboarding",    theme: "on-land",           sort_order: 130 },
  { slug: "camping",         name: "Camping",                  theme: "on-land",           sort_order: 140 },
  { slug: "restaurants",     name: "Restaurants",              theme: "food-drink",        sort_order: 150 },
  { slug: "markets",         name: "Markets & local food",     theme: "food-drink",        sort_order: 160 },
  { slug: "breweries",       name: "Breweries & tasting",      theme: "food-drink",        sort_order: 170 },
  { slug: "landmarks",       name: "Landmarks & scenic spots", theme: "culture-landmarks", sort_order: 180 },
  { slug: "arts-history",    name: "Arts, history & museums",  theme: "culture-landmarks", sort_order: 190 },
  { slug: "events",          name: "Events & festivals",       theme: "culture-landmarks", sort_order: 200 },
  { slug: "when-to-go",      name: "When to go",               theme: "plan-your-trip",    sort_order: 210 },
  { slug: "getting-around",  name: "Getting around",           theme: "plan-your-trip",    sort_order: 220 },
];

const productLines = [
  { slug: "stays", name: "Stays", brand: "arctrips", status: "live",
    blurb: "Cabins, cottages and lodges booked on Arc Trips.", sort_order: 0 },
  { slug: "fishing-charters", name: "Fishing charters", brand: "arctrips-fishing", status: "live",
    external_url: "https://arctripsfishing.com", blurb: "Salmon and halibut charters, run and booked on our fishing site.", sort_order: 10 },
  { slug: "whale-watching-tours", name: "Whale watching tours", brand: "arctrips", status: "coming_soon",
    blurb: "Grey whale and humpback trips, coming to Arc Trips.", sort_order: 20 },
  { slug: "kayaking-tours", name: "Kayaking tours", brand: "arctrips", status: "coming_soon",
    blurb: "Guided paddles, coming to Arc Trips.", sort_order: 30 },
  { slug: "hot-springs-tours", name: "Hot springs tours", brand: "arctrips", status: "coming_soon",
    blurb: "Boat access hot springs trips, coming to Arc Trips.", sort_order: 40 },
];

const categoryProducts = [
  { category_slug: "fishing", product_line_slug: "fishing-charters", priority: 0 },
  { category_slug: "boating", product_line_slug: "fishing-charters", priority: 0 },
  { category_slug: "whale-watching", product_line_slug: "whale-watching-tours", priority: 0 },
  { category_slug: "birding", product_line_slug: "whale-watching-tours", priority: 0 },
  { category_slug: "kayaking", product_line_slug: "kayaking-tours", priority: 0 },
  { category_slug: "hot-springs", product_line_slug: "hot-springs-tours", priority: 0 },
];

const catSort = Object.fromEntries(categories.map((c) => [c.slug, c.sort_order]));
function cityCategory(citySlug, categorySlug, intro, heroPublicId) {
  return {
    city_slug: citySlug, category_slug: categorySlug,
    intro: [{ type: "p", text: intro }],
    hero_public_id: heroPublicId,
    sort_order: catSort[categorySlug] ?? 999,
  };
}

// Tofino: 9 categories. Ucluelet: 6. Per spec section 8. Overwritten by the
// decomposer for docs that exist; hand-written here for fishing (no doc).
const cityCategories = [
  cityCategory("tofino", "beaches", "Thirteen beaches ring Tofino and the Long Beach unit of Pacific Rim National Park, from the surf breaks at Cox Bay to the sheltered sand at Tinwis Beach.", IMG.coast),
  cityCategory("tofino", "surfing", "Tofino is Canada's surf capital: warm-enough water, consistent swell, and a handful of breaks that suit everyone from first lesson to storm-season regulars.", IMG.surf),
  cityCategory("tofino", "kayaking", "Clayoquot Sound's islands and inlets make for some of the calmest, most scenic paddling on the coast, from a short harbour tour to a multi-day trip.", IMG.kayak),
  cityCategory("tofino", "fishing", "Salmon and halibut charters run out of Tofino harbour most of the year, with guides who know the banks and the tides.", IMG.seaplane),
  cityCategory("tofino", "whale-watching", "Grey whales pass close to shore on their spring migration, and resident humpbacks feed in the Sound through summer and fall.", IMG.aerial),
  cityCategory("tofino", "birding", "Tofino sits on the Pacific Flyway, and the mudflats and shoreline around the harbour draw serious birders every spring and fall.", IMG.beach),
  cityCategory("tofino", "storm-watching", "Winter turns Tofino into Canada's storm-watching capital: floor-to-ceiling windows, driftwood-strewn beaches, and Pacific swell hitting the headlands.", IMG.aerial),
  cityCategory("tofino", "hiking", "Short boardwalk loops through old-growth rainforest sit minutes from the beaches, with longer trail options toward Pacific Rim National Park.", IMG.dayhike),
  cityCategory("tofino", "restaurants", "From fish-and-chips shacks to tasting menus built around the day's catch, Tofino punches well above its size for a town this small.", IMG.connection),

  cityCategory("ucluelet", "hiking", "The Wild Pacific Trail is the reason people plan a trip around Ucluelet: a rugged, well-built coastal path in a handful of connected loops.", IMG.dayhike),
  cityCategory("ucluelet", "kayaking", "Sheltered launches inside the harbour give way to open-water paddling toward the Broken Group Islands, all a short drive from town.", IMG.kayak),
  cityCategory("ucluelet", "whale-watching", "Ucluelet's harbour puts boats closer to the migration route than most launch points on the west coast, with grey whales passing from March.", IMG.aerial),
  cityCategory("ucluelet", "birding", "The Wild Pacific Trail headlands are a reliable seabird lookout, and the harbour draws waders and migrating shorebirds through the shoulder seasons.", IMG.beach),
  cityCategory("ucluelet", "restaurants", "A working-harbour town with a chowder-and-fresh-catch food scene that has quietly caught up to its more famous neighbour.", IMG.gallery1),
  cityCategory("ucluelet", "fishing", "Charters run from Ucluelet's harbour for salmon and halibut, with easier water access than the open beaches further up the coast.", IMG.seaplane),
];

// Placeholder rows: the structure is correct from day one, real inventory is out of scope for v1.1 (spec section 9).
const experiences = [
  { slug: "tofino-half-day-salmon", product_line_slug: "fishing-charters", city_slug: "tofino", category_slug: "fishing", title: "Half-day salmon charter", duration: "4 hours", price_from: 189, currency: "CAD", hero_public_id: IMG.seaplane, book_url: "https://arctripsfishing.com", sort_order: 0 },
  { slug: "tofino-grey-whale-tour", product_line_slug: "whale-watching-tours", city_slug: "tofino", category_slug: "whale-watching", title: "Grey whale watching tour", duration: "3 hours", price_from: 129, currency: "CAD", hero_public_id: IMG.aerial, sort_order: 0 },
  { slug: "tofino-clayoquot-kayak-tour", product_line_slug: "kayaking-tours", city_slug: "tofino", category_slug: "kayaking", title: "Clayoquot Sound guided paddle", duration: "2.5 hours", price_from: 99, currency: "CAD", hero_public_id: IMG.kayak, sort_order: 0 },
  { slug: "ucluelet-half-day-halibut", product_line_slug: "fishing-charters", city_slug: "ucluelet", category_slug: "fishing", title: "Half-day halibut charter", duration: "4 hours", price_from: 199, currency: "CAD", hero_public_id: IMG.seaplane, book_url: "https://arctripsfishing.com", sort_order: 0 },
  { slug: "ucluelet-grey-whale-tour", product_line_slug: "whale-watching-tours", city_slug: "ucluelet", category_slug: "whale-watching", title: "Grey whale watching tour", duration: "3 hours", price_from: 129, currency: "CAD", hero_public_id: IMG.aerial, sort_order: 0 },
  { slug: "ucluelet-barkley-sound-kayak-tour", product_line_slug: "kayaking-tours", city_slug: "ucluelet", category_slug: "kayaking", title: "Barkley Sound guided paddle", duration: "2.5 hours", price_from: 99, currency: "CAD", hero_public_id: IMG.kayak, sort_order: 0 },
];

/** PostgREST bulk insert requires every row to share the same keys. Fill the union;
 *  array-typed columns (jsonb NOT NULL) default to [], everything else to null. */
function normalize(rows) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const isArray = Object.fromEntries(keys.map((k) => [k, rows.some((r) => Array.isArray(r[k]))]));
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? (isArray[k] ? [] : null)])));
}

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function wipe(table) {
  // delete every row (id is not null, so this matches all)
  const res = await fetch(`${URL}/rest/v1/${table}?id=not.is.null`, { method: "DELETE", headers: { ...h, Prefer: "return=minimal" } });
  if (!res.ok) throw new Error(`wipe ${table}: ${res.status} ${await res.text()}`);
}

/** For tables without a synthetic `id` column, delete by a natural-key filter (e.g. slug=not.is.null). */
async function wipeBy(table, column) {
  const res = await fetch(`${URL}/rest/v1/${table}?${column}=not.is.null`, { method: "DELETE", headers: { ...h, Prefer: "return=minimal" } });
  if (!res.ok) throw new Error(`wipe ${table}: ${res.status} ${await res.text()}`);
}

async function insert(table, rows) {
  const stripped = rows.map(({ id, ...rest }) => rest); // let DB generate uuid ids
  const res = await fetch(`${URL}/rest/v1/${table}`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(normalize(stripped)) });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  console.log(`seeded ${table}: ${rows.length} rows`);
}

// children first (FKs), then parents. places/photos/experiences (city_categories'
// children) are wiped here too so re-running seed doesn't leave orphans; the
// ingest driver re-populates places/photos from the corpus afterward.
for (const t of ["reviews", "articles", "listings"]) await wipe(t);
await wipeBy("experiences", "slug");
await wipeBy("places", "slug");
await wipeBy("photos", "public_id");
await wipeBy("city_categories", "category_slug");
await wipeBy("category_products", "category_slug");
await wipeBy("product_lines", "slug");
await wipeBy("categories", "slug");
await wipe("destinations");
await wipeBy("regions", "slug");

await insert("regions", regions);
await insert("destinations", destinations);
await insert("categories", categories);
await insert("product_lines", productLines);
await insert("category_products", categoryProducts);
await insert("city_categories", cityCategories);
await insert("experiences", experiences);
await insert("listings", listings);
await insert("articles", articles);
await insert("reviews", reviews);
console.log("done");
