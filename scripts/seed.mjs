/**
 * Seed the Supabase tables to match the landing page's SEED_* content.
 * Prereq: apply supabase/migrations/0001_destinations.sql first (Supabase SQL editor).
 * Run: node --env-file=.env.local scripts/seed.mjs
 * Uses the service-role key (bypasses RLS). Idempotent (upsert on natural keys).
 *
 * Keep the arrays below in sync with app/lib/content.ts SEED_* (same values).
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

const destinations = [
  { slug: "tofino", name: "Tofino", region: "British Columbia", hero_public_id: IMG.coast, listing_count: 134, coming_soon: false, sort_order: 0,
    standfirst: "Storm-swept beaches, old-growth rainforest, and the best surf on the Pacific coast.", overview: tofinoOverview,
    things: [
      { label: "Beaches", heroPublicId: IMG.coast, blurb: "Long Beach, Cox Bay, Chesterman." },
      { label: "Surfing", heroPublicId: IMG.surf, blurb: "Canada's surf capital." },
      { label: "Kayaking", heroPublicId: IMG.kayak, blurb: "Paddle Clayoquot Sound." },
      { label: "Wildlife tours", heroPublicId: IMG.seaplane, blurb: "Whales, bears, seabirds." },
    ],
    gallery: [IMG.coast, IMG.aerial, IMG.surf, IMG.kayak, IMG.dayhike, IMG.beach] },
  { slug: "ucluelet", name: "Ucluelet", region: "British Columbia", hero_public_id: IMG.aerial, listing_count: 158, coming_soon: false, sort_order: 1,
    standfirst: "Tofino's quieter neighbour, wrapped by the Wild Pacific Trail.", overview: uclueletOverview,
    things: [
      { label: "Wild Pacific Trail", heroPublicId: IMG.dayhike, blurb: "The coastal walk people return for." },
      { label: "Kayaking", heroPublicId: IMG.kayak, blurb: "Sheltered launches and open water." },
      { label: "Wildlife watching", heroPublicId: IMG.beach, blurb: "Whales, sea lions, seabirds." },
      { label: "Restaurants", heroPublicId: IMG.gallery1, blurb: "Chowder and fresh catch." },
    ],
    gallery: [IMG.aerial, IMG.coast, IMG.beach, IMG.dayhike, IMG.gallery2, IMG.kayak] },
  { slug: "toronto", name: "Toronto", region: "Ontario", hero_public_id: IMG.beach, listing_count: 0, coming_soon: false, sort_order: 2 },
  { slug: "montreal", name: "Montreal", region: "Quebec", hero_public_id: IMG.surf, listing_count: 0, coming_soon: true, sort_order: 3 },
  { slug: "edmonton", name: "Edmonton", region: "Alberta", hero_public_id: IMG.cabinExterior, listing_count: 0, coming_soon: true, sort_order: 4 },
];

const articles = [
  { slug: "tofino-beaches", destination_slug: "tofino", title: "The Best Beaches in Tofino", category: "Beaches", hero_public_id: IMG.coast, excerpt: "Long Beach, Cox Bay, Chesterman: where to find surf, sand, and sunset walks.", sort_order: 0 },
  { slug: "tofino-surfing", destination_slug: "tofino", title: "Surfing in Tofino", category: "Surfing", hero_public_id: IMG.surf, excerpt: "Canada's surf capital: breaks, seasons, and where to rent a board.", sort_order: 1 },
  { slug: "tofino-kayaking", destination_slug: "tofino", title: "Kayaking in Tofino", category: "On the water", hero_public_id: IMG.kayak, excerpt: "Paddle Clayoquot Sound past islands, inlets, and old-growth shoreline.", sort_order: 2 },
  { slug: "tofino-storm-watching", destination_slug: "tofino", title: "Storm Watching in Tofino", category: "Seasonal", hero_public_id: IMG.aerial, excerpt: "Why winter is the dramatic season on the exposed Pacific coast.", sort_order: 3 },
  { slug: "tofino-wildlife-tours", destination_slug: "tofino", title: "Wildlife Tours in Tofino", category: "Wildlife", hero_public_id: IMG.seaplane, excerpt: "Whales, bears, and seabirds: the tours worth booking.", sort_order: 4 },
  { slug: "tofino-restaurants", destination_slug: "tofino", title: "Where to Eat in Tofino", category: "Food & drink", hero_public_id: IMG.connection, excerpt: "From fish tacos to tasting menus, the town's essential tables.", sort_order: 5 },
  { slug: "ucluelet-hiking", destination_slug: "ucluelet", title: "Ucluelet Hiking Guide", category: "Trails", hero_public_id: IMG.dayhike, excerpt: "The Wild Pacific Trail and the routes that make Ucluelet worth the drive.", sort_order: 0 },
  { slug: "ucluelet-kayaking", destination_slug: "ucluelet", title: "Kayaking in Ucluelet", category: "On the water", hero_public_id: IMG.kayak, excerpt: "Sheltered launches and open-water paddles from the harbour town.", sort_order: 1 },
  { slug: "ucluelet-wildlife-watching", destination_slug: "ucluelet", title: "Wildlife Watching in Ucluelet", category: "Wildlife", hero_public_id: IMG.beach, excerpt: "Grey whales on migration, sea lions, and the spring seabird return.", sort_order: 2 },
  { slug: "ucluelet-restaurants", destination_slug: "ucluelet", title: "Ucluelet Restaurants", category: "Food & drink", hero_public_id: IMG.gallery1, excerpt: "Chowder, fresh catch, and the town's easy-going local rooms.", sort_order: 3 },
];

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

async function insert(table, rows) {
  const stripped = rows.map(({ id, ...rest }) => rest); // let DB generate uuid ids
  const res = await fetch(`${URL}/rest/v1/${table}`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(normalize(stripped)) });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  console.log(`seeded ${table}: ${rows.length} rows`);
}

// children first (FKs), then parents
for (const t of ["reviews", "articles", "listings", "destinations"]) await wipe(t);
await insert("destinations", destinations);
await insert("listings", listings);
await insert("articles", articles);
await insert("reviews", reviews);
console.log("done");
