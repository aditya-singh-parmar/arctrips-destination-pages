import { getServerSupabase } from "./supabase";
import { IMG } from "./cloudinary";
import { CATEGORY_BY_SLUG, CATEGORY_PRODUCTS } from "./taxonomy";
import { resolveCta, type CtaResult } from "./cta";

/* ── Content model ──────────────────────────────────────────────────────────
   Read from Supabase when configured/seeded; otherwise from the SEED data
   below, so the app renders identically before the tables exist. The SEED is
   also the source for the Supabase seed script (scripts/seed.ts).
   Keep these types in sync with supabase/migrations/0001_destinations.sql. */

export type Destination = {
  slug: string;
  name: string;
  region: string;
  heroPublicId: string;
  listingCount: number;
  comingSoon: boolean;
};

export type Listing = {
  id: string;
  title: string;
  location: string;
  destinationSlug: string;
  heroPublicId: string;
  pricePerNight: number;
  currency: string;
  rooms: number;
  beds: number;
  baths: number;
  rating: number;
  guestFavorite: boolean;
  isHoliday: boolean;
};

export type Review = {
  id: string;
  authorName: string;
  authorInitial: string;
  avatarColor: string;
  dated: string;
  body: string;
  mediaPublicId?: string;
  isVideo: boolean;
  isFeatured: boolean;
};

/* ── SEED ─────────────────────────────────────────────────────────────────── */

export const SEED_DESTINATIONS: Destination[] = [
  { slug: "tofino", name: "Tofino", region: "British Columbia", heroPublicId: IMG.coast, listingCount: 134, comingSoon: false },
  { slug: "ucluelet", name: "Ucluelet", region: "British Columbia", heroPublicId: IMG.aerial, listingCount: 158, comingSoon: false },
  { slug: "toronto", name: "Toronto", region: "Ontario", heroPublicId: IMG.beach, listingCount: 0, comingSoon: false },
  { slug: "montreal", name: "Montreal", region: "Quebec", heroPublicId: IMG.surf, listingCount: 0, comingSoon: true },
  { slug: "edmonton", name: "Edmonton", region: "Alberta", heroPublicId: IMG.cabinExterior, listingCount: 0, comingSoon: true },
];

const CARD_IMAGES = [IMG.cabinExterior, IMG.curatedCabin, IMG.cabinInterior, IMG.gallery1, IMG.gallery2, IMG.dayhike, IMG.connection, IMG.founding, IMG.coast];

function makeListing(i: number, over: Partial<Listing>): Listing {
  return {
    id: `seed-${i}`,
    title: "Riverside Cabin Retreat with Hot Tub & Forest Views",
    location: "Canmore, Alberta",
    destinationSlug: "tofino",
    heroPublicId: CARD_IMAGES[i % CARD_IMAGES.length],
    pricePerNight: 420,
    currency: "CAD",
    rooms: 2,
    beds: 3,
    baths: 2,
    rating: 4.9,
    guestFavorite: false,
    isHoliday: false,
    ...over,
  };
}

export const SEED_LISTINGS: Listing[] = [
  // Recently viewed
  makeListing(0, { location: "Canmore, Alberta", title: "Riverside Cabin Retreat with Hot Tub & Forest Views" }),
  makeListing(1, { location: "Canmore, Alberta", title: "Coastal Bed-Cliff Cottage with Private Beach & Firepit" }),
  makeListing(2, { destinationSlug: "tofino", location: "Tofino, British Columbia" }),
  // Tofino rail
  makeListing(3, { destinationSlug: "tofino", location: "Tofino, British Columbia", title: "Riverside Cabin Retreat with Hot Tub & Forest Views" }),
  makeListing(4, { destinationSlug: "tofino", location: "Tofino, British Columbia", title: "Cozy Mountain Chalet with Sauna, Fireplace & Trails Nearby", pricePerNight: 320 }),
  makeListing(5, { destinationSlug: "tofino", location: "Tofino, British Columbia", title: "Lakefront Cottage with Private Dock & Canoes Included", pricePerNight: 500 }),
  // Ucluelet rail
  makeListing(6, { destinationSlug: "ucluelet", location: "Ucluelet, British Columbia", title: "Alpine Timber Chalet with Mountain Hot Tub & Stargazing Deck", pricePerNight: 385 }),
  makeListing(7, { destinationSlug: "ucluelet", location: "Ucluelet, British Columbia", title: "Modern Lakeside Villa with Rooftop Lounge & Marina Access", pricePerNight: 450 }),
  makeListing(8, { destinationSlug: "ucluelet", location: "Ucluelet, British Columbia", title: "Historic Old-Town Loft with Stone Walls & River Views", pricePerNight: 320 }),
  // Holiday rail (guest favorite)
  makeListing(9, { guestFavorite: true, isHoliday: true, title: "Riverside Cabin Retreat with Hot Tub & Forest Views" }),
  makeListing(10, { guestFavorite: true, isHoliday: true, title: "Riverside Cabin Retreat with Hot Tub & Forest Views" }),
  makeListing(11, { guestFavorite: true, isHoliday: true, title: "Riverside Cabin Retreat with Hot Tub & Forest Views" }),
];

export const SEED_REVIEWS: Review[] = [
  { id: "r1", authorName: "Marilyn Moses", authorInitial: "M", avatarColor: "#D4C4AF", dated: "Jul 2024", isVideo: false, isFeatured: false,
    body: "Thanks for a great fishing trip! Ray was fun to be with and a very knowledgeable and experienced fishing guide. He was a huge help while I was bringing in the big salmon. The overnight accommodations you arranged were great. When not fishing, we really enjoyed walking the Wild Pacific Trail, browsing the little shops, and sampling the restaurants." },
  { id: "r2", authorName: "Rachel B.", authorInitial: "R", avatarColor: "#F6B7C5", dated: "Aug 2024", isVideo: false, isFeatured: false,
    body: "Hi Sam, I have to say we all had a wonderful time. You have a jewel in Dan the chef here he was the greatest! He did so much for us and I am very appreciative of his ongoing extra mile for us. Thanks, Well be in touch again." },
  { id: "r3", authorName: "Sophia L.", authorInitial: "S", avatarColor: "#D4C4AF", dated: "Jul 2024", isVideo: false, isFeatured: false,
    body: "We absolutely loved our stay! The home was spotless, beautifully furnished, and felt incredibly welcoming from the moment we walked in." },
  { id: "r4", authorName: "Brent M.", authorInitial: "B", avatarColor: "#E8F4F0", dated: "Aug 2025", isVideo: false, isFeatured: false,
    body: "Such a beautiful property! The decor felt premium yet cozy, and the kitchen was fully stocked for cooking meals at home. We loved how close we were to trails and small cafes. It genuinely felt like a home away from home. Highly recommend staying here, you won't regret it!" },
  { id: "r5", authorName: "Daniel T.", authorInitial: "D", avatarColor: "#2F7D64", dated: "Aug 2025", isVideo: true, isFeatured: true, mediaPublicId: IMG.aerial,
    body: "The guides were top-notch, knew the tides and got us on fish within an hour." },
  { id: "r6", authorName: "Amelia C.", authorInitial: "A", avatarColor: "#E8F4F0", dated: "Aug 2025", isVideo: false, isFeatured: false,
    body: "Beautiful, clean, and cozy stay. Everything felt premium and thoughtfully prepared. Highly recommend!" },
];

/* ── Reads (Supabase → seed fallback) ───────────────────────────────────────── */

export async function getDestinations(): Promise<Destination[]> {
  const s = getServerSupabase();
  if (s) {
    const { data, error } = await s
      .from("destinations")
      .select("slug,name,region,hero_public_id,listing_count,coming_soon")
      .order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map((d) => ({
        slug: d.slug, name: d.name, region: d.region ?? "",
        heroPublicId: d.hero_public_id ?? IMG.coast,
        listingCount: d.listing_count ?? 0, comingSoon: d.coming_soon ?? false,
      }));
    }
  }
  return SEED_DESTINATIONS;
}

export async function getListings(filter?: {
  destinationSlug?: string;
  holiday?: boolean;
}): Promise<Listing[]> {
  const s = getServerSupabase();
  if (s) {
    let q = s.from("listings").select("*");
    if (filter?.destinationSlug) q = q.eq("destination_slug", filter.destinationSlug);
    if (filter?.holiday) q = q.eq("is_holiday", true);
    const { data, error } = await q;
    if (!error && data && data.length) {
      return data.map((l) => ({
        id: l.id, title: l.title, location: l.location ?? "",
        destinationSlug: l.destination_slug ?? "",
        heroPublicId: l.hero_public_id ?? IMG.cabinExterior,
        pricePerNight: Number(l.price_per_night ?? 0), currency: l.currency ?? "CAD",
        rooms: l.rooms ?? 0, beds: l.beds ?? 0, baths: l.baths ?? 0,
        rating: Number(l.rating ?? 0), guestFavorite: l.guest_favorite ?? false,
        isHoliday: l.is_holiday ?? false,
      }));
    }
  }
  let out = SEED_LISTINGS;
  if (filter?.destinationSlug) out = out.filter((l) => l.destinationSlug === filter.destinationSlug);
  if (filter?.holiday) out = out.filter((l) => l.isHoliday);
  return out;
}

export async function getReviews(): Promise<Review[]> {
  const s = getServerSupabase();
  if (s) {
    const { data, error } = await s
      .from("reviews")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map((r) => ({
        id: r.id, authorName: r.author_name, authorInitial: r.author_initial ?? "",
        avatarColor: r.avatar_color ?? "#D4C4AF", dated: r.dated ?? "", body: r.body ?? "",
        mediaPublicId: r.media_public_id ?? undefined, isVideo: r.is_video ?? false,
        isFeatured: r.is_featured ?? false,
      }));
    }
  }
  return SEED_REVIEWS;
}

/* ── Area / destination pages (Phase 2) ─────────────────────────────────────
   Structure per Sam: an area page carries an overview and a jump-menu of
   sections so a reader can skip to what interests them (things to do, guides /
   articles, stays). Articles make Arc Trips the "authority" on each area.
   Article bodies come from the New Articles corpus ingestion (later); until
   then a guide page renders its excerpt + a "full guide coming soon" note. */

export type ThingToDo = { label: string; heroPublicId: string; blurb: string };
export type ArticleBlock = {
  type: "h" | "p" | "img" | "list" | "table";
  text?: string;
  publicId?: string;
  w?: number;
  h?: number;
  items?: string[];
  rows?: string[][];
};
export type Faq = { q: string; a: string };

export type Article = {
  slug: string;
  destinationSlug: string;
  title: string;
  category: string;
  heroPublicId: string;
  excerpt: string;
  /** Rich body ingested from the New Articles corpus; empty until ingested. */
  body?: ArticleBlock[];
  /** v1.1 tree: an article can span multiple cities and hangs off one category. */
  citySlugs?: string[];
  regionSlug?: string;
  categorySlug?: string;
  faqs?: Faq[];
};
export type AreaSection = { id: string; label: string };
export type AreaPage = {
  slug: string;
  name: string;
  region: string;
  heroPublicId: string;
  standfirst: string;
  overview: string[];
  things: ThingToDo[];
  galleryPublicIds: string[];
  sections: AreaSection[];
};

const SEED_ARTICLES: Article[] = [
  // Tofino
  { slug: "tofino-beaches", destinationSlug: "tofino", title: "The Best Beaches in Tofino", category: "Beaches", heroPublicId: IMG.coast, excerpt: "Long Beach, Cox Bay, Chesterman: where to find surf, sand, and sunset walks." },
  { slug: "tofino-surfing", destinationSlug: "tofino", title: "Surfing in Tofino", category: "Surfing", heroPublicId: IMG.surf, excerpt: "Canada's surf capital: breaks, seasons, and where to rent a board." },
  { slug: "tofino-kayaking", destinationSlug: "tofino", title: "Kayaking in Tofino", category: "On the water", heroPublicId: IMG.kayak, excerpt: "Paddle Clayoquot Sound past islands, inlets, and old-growth shoreline." },
  { slug: "tofino-storm-watching", destinationSlug: "tofino", title: "Storm Watching in Tofino", category: "Seasonal", heroPublicId: IMG.aerial, excerpt: "Why winter is the dramatic season on the exposed Pacific coast." },
  { slug: "tofino-wildlife-tours", destinationSlug: "tofino", title: "Wildlife Tours in Tofino", category: "Wildlife", heroPublicId: IMG.seaplane, excerpt: "Whales, bears, and seabirds: the tours worth booking." },
  { slug: "tofino-restaurants", destinationSlug: "tofino", title: "Where to Eat in Tofino", category: "Food & drink", heroPublicId: IMG.connection, excerpt: "From fish tacos to tasting menus, the town's essential tables." },
  // Ucluelet
  { slug: "ucluelet-hiking", destinationSlug: "ucluelet", title: "Ucluelet Hiking Guide", category: "Trails", heroPublicId: IMG.dayhike, excerpt: "The Wild Pacific Trail and the routes that make Ucluelet worth the drive." },
  { slug: "ucluelet-kayaking", destinationSlug: "ucluelet", title: "Kayaking in Ucluelet", category: "On the water", heroPublicId: IMG.kayak, excerpt: "Sheltered launches and open-water paddles from the harbour town." },
  { slug: "ucluelet-wildlife-watching", destinationSlug: "ucluelet", title: "Wildlife Watching in Ucluelet", category: "Wildlife", heroPublicId: IMG.beach, excerpt: "Grey whales on migration, sea lions, and the spring seabird return." },
  { slug: "ucluelet-restaurants", destinationSlug: "ucluelet", title: "Ucluelet Restaurants", category: "Food & drink", heroPublicId: IMG.gallery1, excerpt: "Chowder, fresh catch, and the town's easy-going local rooms." },
];

const AREA_SECTIONS: AreaSection[] = [
  { id: "overview", label: "Overview" },
  { id: "things", label: "Things to do" },
  { id: "guides", label: "Guides & articles" },
  { id: "stays", label: "Where to stay" },
  { id: "gallery", label: "Gallery" },
];

const SEED_AREAS: Record<string, Omit<AreaPage, "sections">> = {
  tofino: {
    slug: "tofino", name: "Tofino", region: "British Columbia", heroPublicId: IMG.coast,
    standfirst: "Storm-swept beaches, old-growth rainforest, and the best surf on the Pacific coast.",
    overview: [
      "Tofino sits at the western edge of Vancouver Island, where the rainforest meets long stretches of open Pacific beach. It draws surfers, storm-watchers, and travelers looking for quiet time close to the water.",
      "Plan around the tides and the seasons. Summer brings calm mornings and warm evenings on the sand, while winter delivers dramatic storm-watching and empty beaches. Whatever the season, the pace here rewards staying a few nights rather than passing through.",
    ],
    things: [
      { label: "Beaches", heroPublicId: IMG.coast, blurb: "Long Beach, Cox Bay, Chesterman." },
      { label: "Surfing", heroPublicId: IMG.surf, blurb: "Canada's surf capital." },
      { label: "Kayaking", heroPublicId: IMG.kayak, blurb: "Paddle Clayoquot Sound." },
      { label: "Wildlife tours", heroPublicId: IMG.seaplane, blurb: "Whales, bears, seabirds." },
    ],
    galleryPublicIds: [IMG.coast, IMG.aerial, IMG.surf, IMG.kayak, IMG.dayhike, IMG.beach],
  },
  ucluelet: {
    slug: "ucluelet", name: "Ucluelet", region: "British Columbia", heroPublicId: IMG.aerial,
    standfirst: "Tofino's quieter neighbour, wrapped by the Wild Pacific Trail.",
    overview: [
      "Ucluelet sits at the tip of the peninsula south of Tofino, wrapped by the Wild Pacific Trail. It keeps a working-harbour character and tends to feel calmer than its better-known neighbour.",
      "It makes a natural base for whale watching, wildlife tours, and long coastal walks, with easy access to Pacific Rim National Park just up the road.",
    ],
    things: [
      { label: "Wild Pacific Trail", heroPublicId: IMG.dayhike, blurb: "The coastal walk people return for." },
      { label: "Kayaking", heroPublicId: IMG.kayak, blurb: "Sheltered launches and open water." },
      { label: "Wildlife watching", heroPublicId: IMG.beach, blurb: "Whales, sea lions, seabirds." },
      { label: "Restaurants", heroPublicId: IMG.gallery1, blurb: "Chowder and fresh catch." },
    ],
    galleryPublicIds: [IMG.aerial, IMG.coast, IMG.beach, IMG.dayhike, IMG.gallery2, IMG.kayak],
  },
};

export async function getAreaPage(slug: string): Promise<AreaPage | null> {
  const s = getServerSupabase();
  if (s) {
    const { data } = await s
      .from("destinations")
      .select("slug,name,region,hero_public_id,standfirst,overview,things,gallery")
      .eq("slug", slug)
      .maybeSingle();
    if (data && data.standfirst) {
      return {
        slug: data.slug, name: data.name, region: data.region ?? "",
        heroPublicId: data.hero_public_id ?? IMG.coast, standfirst: data.standfirst ?? "",
        overview: data.overview ?? [], things: data.things ?? [],
        galleryPublicIds: (data.gallery ?? []).map((g: { publicId?: string } | string) => typeof g === "string" ? g : (g.publicId ?? "")).filter(Boolean),
        sections: AREA_SECTIONS,
      };
    }
  }
  const seed = SEED_AREAS[slug];
  return seed ? { ...seed, sections: AREA_SECTIONS } : null;
}

/** Shared row → Article mapping for both the legacy single-city read and the v1.1 tree read. */
function mapArticleRow(a: {
  slug: string; destination_slug?: string | null; title: string; category?: string | null;
  hero_public_id?: string | null; excerpt?: string | null; body?: ArticleBlock[] | null;
  city_slugs?: string[] | null; region_slug?: string | null; category_slug?: string | null; faqs?: Faq[] | null;
}): Article {
  return {
    slug: a.slug, destinationSlug: a.destination_slug ?? "", title: a.title, category: a.category ?? "",
    heroPublicId: a.hero_public_id ?? IMG.coast, excerpt: a.excerpt ?? "", body: a.body ?? [],
    citySlugs: a.city_slugs ?? undefined, regionSlug: a.region_slug ?? undefined,
    categorySlug: a.category_slug ?? undefined, faqs: a.faqs ?? undefined,
  };
}

export async function getArticles(destinationSlug: string): Promise<Article[]> {
  const s = getServerSupabase();
  if (s) {
    const { data } = await s.from("articles").select("*").eq("destination_slug", destinationSlug).order("sort_order", { ascending: true });
    if (data && data.length) {
      return data.map(mapArticleRow);
    }
  }
  return SEED_ARTICLES.filter((a) => a.destinationSlug === destinationSlug);
}

/**
 * v1.1 tree read: matches on the `city_slugs` array rather than `destination_slug`,
 * because some articles (Whale Festival, Best Time to Stay, Campgrounds) span two
 * towns. Optionally narrows to one category.
 */
export async function getArticlesForCity(citySlug: string, categorySlug?: string): Promise<Article[]> {
  const s = getServerSupabase();
  if (s) {
    let q = s.from("articles").select("*").contains("city_slugs", [citySlug]);
    if (categorySlug) q = q.eq("category_slug", categorySlug);
    const { data, error } = await q.order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map(mapArticleRow);
    }
  }
  let out = SEED_ARTICLES.filter(
    (a) => a.destinationSlug === citySlug || (a.citySlugs ?? []).includes(citySlug),
  );
  if (categorySlug) out = out.filter((a) => a.categorySlug === categorySlug);
  return out;
}

/**
 * Region-level articles ("How to Choose a Vacation Rental on Vancouver
 * Island"): `region_slug` set, `city_slugs` empty. Added for Task 12 (region
 * pages), same Supabase-then-SEED fallback shape as `getArticlesForCity`
 * above; there is no SEED equivalent yet since no region-level article
 * existed before the v1.1 corpus ingest, so the fallback is an empty list.
 */
export async function getArticlesForRegion(regionSlug: string): Promise<Article[]> {
  const s = getServerSupabase();
  if (s) {
    const { data, error } = await s
      .from("articles")
      .select("*")
      .eq("region_slug", regionSlug)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      return data.map(mapArticleRow);
    }
  }
  return [];
}

export async function getArticle(destinationSlug: string, articleSlug: string): Promise<Article | null> {
  const all = await getArticles(destinationSlug);
  return all.find((a) => a.slug === articleSlug) ?? null;
}

/**
 * Standalone article by slug, for `/guides/[slug]`. These are the planning
 * pieces and cross-cutting reads (whale festival, best time to stay,
 * campgrounds), several of which span both towns, so they are not scoped to
 * a city. Excludes the `-faq` carrier rows, which have no body of their own.
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (slug.endsWith("-faq")) return null;
  const s = getServerSupabase();
  if (s) {
    const { data } = await s.from("articles").select("*").eq("slug", slug).maybeSingle();
    if (data) return mapArticleRow(data);
  }
  return SEED_ARTICLES.find((a) => a.slug === slug) ?? null;
}

/** Slugs with a real body, so `/guides/[slug]` never prerenders an empty page. */
export async function getAllArticleSlugs(): Promise<string[]> {
  const s = getServerSupabase();
  if (s) {
    const { data } = await s.from("articles").select("slug,body");
    if (data?.length) {
      return data
        .filter((a) => !a.slug.endsWith("-faq") && (a.body?.length ?? 0) > 0)
        .map((a) => a.slug);
    }
  }
  return SEED_ARTICLES.map((a) => a.slug);
}

export async function getAllAreaSlugs(): Promise<string[]> {
  const dests = await getDestinations();
  return dests.filter((d) => !d.comingSoon).map((d) => d.slug);
}

/** Slugs that actually have a navigable area page (rich content), so links never 404. */
export async function getNavigableSlugs(): Promise<string[]> {
  const slugs = await getAllAreaSlugs();
  const checked = await Promise.all(slugs.map(async (s) => ((await getAreaPage(s)) ? s : null)));
  return checked.filter((s): s is string => Boolean(s));
}

/* ── v1.1 tree: Region > City > Category > Place ────────────────────────────
   Reads for docs/superpowers/specs/2026-07-24-destination-pages-v1.1-design.md
   section 4. Same Supabase → SEED fallback pattern as the reads above. Keep
   these types in sync with supabase/migrations/0002_tree.sql. */

export type Region = {
  slug: string;
  name: string;
  heroPublicId: string;
  blurb: string;
  sortOrder: number;
};

export type City = {
  slug: string;
  name: string;
  regionSlug: string | null;
  heroPublicId: string;
  standfirst: string;
  overview: string[];
  listingCount: number;
  comingSoon: boolean;
};

/** The per-city category page body. A category exists for a city only if it has a row here. */
export type CityCategory = {
  citySlug: string;
  categorySlug: string;
  intro: ArticleBlock[];
  heroPublicId?: string;
  sortOrder: number;
};

export type Place = {
  id: string;
  slug: string;
  citySlug: string;
  categorySlug: string;
  name: string;
  blurb: string;
  body: ArticleBlock[];
  goodFor: string[];
  goodToKnow?: string;
  heroPublicId?: string;
  lat?: number;
  lng?: number;
  sortOrder: number;
};

export type Photo = {
  id: string;
  publicId: string;
  citySlug?: string;
  categorySlug?: string;
  /** Matches places.slug within the city+category. What lets the gallery say "Long Beach". */
  placeSlug?: string;
  caption?: string;
  sourceUrl?: string;
  sortOrder: number;
};

export type Experience = {
  id: string;
  slug: string;
  productLineSlug: string;
  citySlug?: string;
  categorySlug?: string;
  placeSlug?: string;
  title: string;
  duration?: string;
  priceFrom?: number;
  currency: string;
  heroPublicId?: string;
  bookUrl?: string;
  sortOrder: number;
};

/* ── SEED: v1.1 tree ──────────────────────────────────────────────────────── */

export const SEED_REGIONS: Region[] = [
  { slug: "vancouver-island", name: "Vancouver Island", heroPublicId: IMG.coast,
    blurb: "Rainforest, surf beaches, and whale-watching water on Canada's Pacific coast.", sortOrder: 0 },
];

function cityCategory(citySlug: string, categorySlug: string, intro: string, heroPublicId: string): CityCategory {
  return {
    citySlug, categorySlug,
    intro: [{ type: "p", text: intro }],
    heroPublicId,
    sortOrder: CATEGORY_BY_SLUG.get(categorySlug)?.sortOrder ?? 999,
  };
}

/** Tofino: 9 categories. Ucluelet: 6. Per spec section 8. */
export const SEED_CITY_CATEGORIES: CityCategory[] = [
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

/** The 13 Tofino beaches from `Tofino - Beaches.docx`, verified against the corpus. */
export const SEED_PLACES: Place[] = [
  {
    id: "seed-chesterman-beach", slug: "chesterman-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Chesterman Beach",
    blurb: "One of the most loved beaches in Tofino: long, sandy, and easy to enjoy close to town.",
    body: [
      { type: "p", text: "Chesterman Beach is one of the most loved beaches in Tofino. It is long, sandy, and easy to enjoy. It is close to town and popular with walkers, surfers, families, and photographers." },
      { type: "p", text: "Chesterman is split into North Chesterman and South Chesterman. At low tide, you can walk across the sandspit, also called a tombolo, toward Frank Island. This is one of the most scenic beach walks in Tofino." },
    ],
    goodFor: ["Long beach walks", "Beginner surf lessons", "Sunset photos", "Sandcastles"],
    heroPublicId: IMG.coast, sortOrder: 10,
  },
  {
    id: "seed-cox-bay", slug: "cox-bay", citySlug: "tofino", categorySlug: "beaches",
    name: "Cox Bay",
    blurb: "Wide, open, and facing the Pacific: one of the best beaches in Tofino for surfing.",
    body: [
      { type: "p", text: "Cox Bay is one of the best beaches in Tofino for surfing. It is wide, open, and faces the Pacific Ocean. Because of this, it often gets strong and steady waves." },
      { type: "p", text: "Many surfers love Cox Bay. It is also a beautiful place to watch the waves from shore. On clear evenings, it can be a great sunset beach." },
      { type: "p", text: "Cox Bay is also known for the short Cox Bay lookout hike. The trail can be muddy and steep, but the view over the beach is one of the most popular photo spots near Tofino." },
    ],
    goodFor: ["Surfing", "Watching surfers", "Sunsets", "Storm watching"],
    heroPublicId: IMG.surf, sortOrder: 20,
  },
  {
    id: "seed-long-beach", slug: "long-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Long Beach",
    blurb: "One of the most famous beaches on Vancouver Island, inside Pacific Rim National Park Reserve.",
    body: [
      { type: "p", text: "Long Beach is one of the most famous beaches on Vancouver Island. It is part of Pacific Rim National Park Reserve, between Tofino and Ucluelet." },
      { type: "p", text: "As the name says, Long Beach is very long. It gives you that classic west coast feeling: open sand, big sky, rolling waves, and rainforest behind you." },
      { type: "p", text: "Long Beach is a great place for walking, surfing, watching waves, and taking photos. It also has nearby trails and visitor areas in the national park." },
    ],
    goodFor: ["Long walks", "Big beach views", "Surfing", "Photography"],
    heroPublicId: IMG.beach, sortOrder: 30,
  },
  {
    id: "seed-tinwis-beach-formerly-mackenzie-beach", slug: "tinwis-beach-formerly-mackenzie-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Tinwis Beach, formerly Mackenzie Beach",
    blurb: "A calmer, more sheltered beach near Tofino, popular with families.",
    body: [
      { type: "p", text: "Tinwis Beach, formerly known as Mackenzie Beach, is a calmer and more sheltered beach near Tofino. It does not face the open ocean as directly as Cox Bay or Long Beach, so the water is often gentler." },
      { type: "p", text: "This makes it a favorite for families, relaxed beach time, and people who want a softer beach experience. It is also a good place to enjoy tide pools and coastal views when conditions are safe." },
    ],
    goodFor: ["Families", "Calmer beach days", "Paddleboarding in gentle conditions", "Tide pools"],
    heroPublicId: IMG.beach, sortOrder: 40,
  },
  {
    id: "seed-tonquin-beach", slug: "tonquin-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Tonquin Beach",
    blurb: "A small, quiet beach close to the village, reached by a short forest trail.",
    body: [
      { type: "p", text: "Tonquin Beach is a smaller beach close to the village of Tofino. You reach it by walking a short forest trail. It feels quieter and more hidden than the big surf beaches." },
      { type: "p", text: "Tonquin Beach is not as wide as Chesterman or Long Beach, but it has a peaceful feel. It is a nice place for a short walk, a picnic, or a quiet sunset." },
    ],
    goodFor: ["Short walks", "Quiet beach time", "Picnics", "Sunset views", "Forest-and-beach scenery"],
    heroPublicId: IMG.coast, sortOrder: 50,
  },
  {
    id: "seed-middle-beach", slug: "middle-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Middle Beach",
    blurb: "A smaller, tucked-away beach area near Chesterman, with rocky edges and forest.",
    body: [
      { type: "p", text: "Middle Beach is a smaller beach area near Chesterman Beach. It has a more tucked-away feel, with rocky edges, forest, and ocean views." },
      { type: "p", text: "It is a nice place if you want something quieter than the larger beaches. It is not always the best place for swimming or surfing, but it can be lovely for photos and peaceful walks." },
    ],
    goodFor: ["Quiet views", "Photography", "Short walks", "Relaxing near the ocean"],
    goodToKnow: "Check tide and wave conditions before walking near rocks.",
    heroPublicId: IMG.coast, sortOrder: 60,
  },
  {
    id: "seed-rosie-bay", slug: "rosie-bay", citySlug: "tofino", categorySlug: "beaches",
    name: "Rosie Bay",
    blurb: "A smaller, quieter beach near Cox Bay with interesting low-tide rocks and pools.",
    body: [
      { type: "p", text: "Rosie Bay is a smaller beach near Cox Bay. It is less famous than the main beaches, but it can be a nice stop for people who like quieter places." },
      { type: "p", text: "At low tide, you may find interesting rocks, sand, and small pools. It is also a scenic area for photos." },
    ],
    goodFor: ["Quiet exploring", "Low tide walks", "Photography", "A break from busier beaches"],
    goodToKnow: "Be careful near rocks and changing tides.",
    heroPublicId: IMG.coast, sortOrder: 70,
  },
  {
    id: "seed-wickaninnish-beach", slug: "wickaninnish-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Wickaninnish Beach",
    blurb: "One of the best places near Tofino for big ocean views and storm watching, next to the Kwisitis Visitor Centre.",
    body: [
      { type: "p", text: "Wickaninnish Beach is in Pacific Rim National Park Reserve, closer to the Ucluelet side of the Long Beach area. It is one of the best places near Tofino for big ocean views and storm watching." },
      { type: "p", text: "The nearby Kwisitis Visitor Centre makes this beach extra useful for visitors. You can learn about the coast, local wildlife, and the history of the area. There is also a viewing area, which is helpful when the beach feels too rough or windy." },
    ],
    goodFor: ["Storm watching", "Big ocean views", "Photography", "Sunset watching", "Learning about the coast", "Visiting the Kwisitis Visitor Centre"],
    goodToKnow: "This beach can feel very open and exposed. Stay far back from the water during storms and high tide.",
    heroPublicId: IMG.aerial, sortOrder: 80,
  },
  {
    id: "seed-florencia-bay", slug: "florencia-bay", citySlug: "tofino", categorySlug: "beaches",
    name: "Florencia Bay",
    blurb: "A quieter national-park beach known for its sand cliffs and scenic shoreline.",
    body: [
      { type: "p", text: "Florencia Bay is also in Pacific Rim National Park Reserve. It is closer to Ucluelet than Tofino, but it is still a great stop on a Tofino beach trip." },
      { type: "p", text: "Florencia Bay is known for its sand cliffs, quiet feel, and scenic shoreline. To reach the beach, you walk a trail and take a wooden staircase down to the shore." },
      { type: "p", text: "It feels less busy than Chesterman, Cox Bay, and Long Beach. This makes it a good choice for people who want a slower, quieter beach visit." },
    ],
    goodFor: ["Quiet beach walks", "Sand cliff views", "Photography", "Low-tide exploring", "A less crowded beach visit"],
    goodToKnow: "The stairs and trail can feel longer on the way back up. Wear comfortable shoes and check the tide before walking far.",
    heroPublicId: IMG.coast, sortOrder: 90,
  },
  {
    id: "seed-combers-beach", slug: "combers-beach", citySlug: "tofino", categorySlug: "beaches",
    name: "Combers Beach",
    blurb: "One of the wilder national-park beaches near Tofino, good for a long, quiet walk.",
    body: [
      { type: "p", text: "Combers Beach is part of Pacific Rim National Park Reserve. It is not a town beach, but it is one of the wilder beaches near Tofino." },
      { type: "p", text: "Combers Beach is good for visitors who want a natural, open beach experience. It can feel quieter than Chesterman or Cox Bay. It is a good place for a long walk, but you should check trail access, tide times, and park updates before going." },
    ],
    goodFor: ["Long beach walks", "Quiet nature time", "Photography", "Storm watching from a safe distance", "A wilder beach feel"],
    goodToKnow: "Dog rules and access rules can change in Pacific Rim National Park Reserve. Check current Parks Canada updates before visiting with a dog.",
    heroPublicId: IMG.coast, sortOrder: 100,
  },
  {
    id: "seed-schooner-cove", slug: "schooner-cove", citySlug: "tofino", categorySlug: "beaches",
    name: "Schooner Cove",
    blurb: "A tucked-away, forest-to-beach stop near the Tofino end of Long Beach.",
    body: [
      { type: "p", text: "Schooner Cove is also in Pacific Rim National Park Reserve, closer to the Tofino end of the Long Beach area." },
      { type: "p", text: "It is worth visiting if you like forest-to-beach scenery and quieter places. It has a more tucked-away feeling than the main beaches near town. It is best for people who want a slower nature stop, not a busy beach day." },
    ],
    goodFor: ["Forest and beach views", "Quiet exploring", "Nature photos", "Peaceful walks", "A less crowded beach stop"],
    goodToKnow: "Trail and beach access can change in national park areas. Check current Parks Canada updates before planning your visit.",
    heroPublicId: IMG.dayhike, sortOrder: 110,
  },
  {
    id: "seed-grice-bay", slug: "grice-bay", citySlug: "tofino", categorySlug: "beaches",
    name: "Grice Bay",
    blurb: "A sheltered inlet bay, better for kayaking and birding than surf.",
    body: [
      { type: "p", text: "Grice Bay is different from the other beaches on this list. It is not a big open Pacific Ocean surf beach. It is a sheltered bay on the calmer inlet side near Tofino and Pacific Rim National Park Reserve." },
      { type: "p", text: "This means Grice Bay is not the place to go for surfing, big waves, or classic sandy beach photos. But it is still worth visiting if you like calm water, kayaking, bird watching, and peaceful views." },
    ],
    goodFor: ["Kayaking", "Paddle trips", "Bird watching", "Calm water views", "A quiet nature stop"],
    goodToKnow: "Choose Grice Bay for calm inlet scenery, not for surfing or storm watching.",
    heroPublicId: IMG.kayak, sortOrder: 120,
  },
  {
    id: "seed-kennedy-lake", slug: "kennedy-lake", citySlug: "tofino", categorySlug: "beaches",
    name: "Kennedy Lake",
    blurb: "A large freshwater lake near Tofino and Ucluelet, for calm-water paddling rather than surf.",
    body: [
      { type: "p", text: "Kennedy Lake is not a beach in Tofino town, and it is not an open Pacific Ocean beach. It is a large freshwater lake near Tofino and Ucluelet, close to Pacific Rim National Park Reserve." },
      { type: "p", text: "It is worth adding to a Tofino beach and water guide because it gives visitors a different kind of water experience. Instead of big waves, surf, and storm watching, Kennedy Lake is known for calmer water, forest views, and peaceful lake scenery." },
    ],
    goodFor: ["Freshwater lake views", "Kayaking or canoeing", "Paddleboarding in calm conditions", "Quiet nature time", "Photography", "A break from windy ocean beaches"],
    goodToKnow: "Kennedy Lake is best for calm-water activities, not surfing or storm watching. Conditions can still change, so check the weather and wind before paddling.",
    heroPublicId: IMG.kayak, sortOrder: 130,
  },
];

/** Placeholder rows: the structure is correct from day one, real inventory is out of scope for v1.1 (spec section 9). */
export const SEED_EXPERIENCES: Experience[] = [
  { id: "seed-exp-tofino-fishing-1", slug: "tofino-half-day-salmon", productLineSlug: "fishing-charters",
    citySlug: "tofino", categorySlug: "fishing", title: "Half-day salmon charter", duration: "4 hours",
    priceFrom: 189, currency: "CAD", heroPublicId: IMG.seaplane, bookUrl: "https://arctripsfishing.com", sortOrder: 0 },
  { id: "seed-exp-tofino-whale-1", slug: "tofino-grey-whale-tour", productLineSlug: "whale-watching-tours",
    citySlug: "tofino", categorySlug: "whale-watching", title: "Grey whale watching tour", duration: "3 hours",
    priceFrom: 129, currency: "CAD", heroPublicId: IMG.aerial, sortOrder: 0 },
  { id: "seed-exp-tofino-kayak-1", slug: "tofino-clayoquot-kayak-tour", productLineSlug: "kayaking-tours",
    citySlug: "tofino", categorySlug: "kayaking", title: "Clayoquot Sound guided paddle", duration: "2.5 hours",
    priceFrom: 99, currency: "CAD", heroPublicId: IMG.kayak, sortOrder: 0 },
  { id: "seed-exp-ucluelet-fishing-1", slug: "ucluelet-half-day-halibut", productLineSlug: "fishing-charters",
    citySlug: "ucluelet", categorySlug: "fishing", title: "Half-day halibut charter", duration: "4 hours",
    priceFrom: 199, currency: "CAD", heroPublicId: IMG.seaplane, bookUrl: "https://arctripsfishing.com", sortOrder: 0 },
  { id: "seed-exp-ucluelet-whale-1", slug: "ucluelet-grey-whale-tour", productLineSlug: "whale-watching-tours",
    citySlug: "ucluelet", categorySlug: "whale-watching", title: "Grey whale watching tour", duration: "3 hours",
    priceFrom: 129, currency: "CAD", heroPublicId: IMG.aerial, sortOrder: 0 },
  { id: "seed-exp-ucluelet-kayak-1", slug: "ucluelet-barkley-sound-kayak-tour", productLineSlug: "kayaking-tours",
    citySlug: "ucluelet", categorySlug: "kayaking", title: "Barkley Sound guided paddle", duration: "2.5 hours",
    priceFrom: 99, currency: "CAD", heroPublicId: IMG.kayak, sortOrder: 0 },
];

const SEED_CITIES: Record<string, City> = {
  tofino: {
    slug: "tofino", name: "Tofino", regionSlug: "vancouver-island", heroPublicId: IMG.coast,
    standfirst: "Storm-swept beaches, old-growth rainforest, and the best surf on the Pacific coast.",
    overview: [
      "Tofino sits at the western edge of Vancouver Island, where the rainforest meets long stretches of open Pacific beach. It draws surfers, storm-watchers, and travelers looking for quiet time close to the water.",
      "Plan around the tides and the seasons. Summer brings calm mornings and warm evenings on the sand, while winter delivers dramatic storm-watching and empty beaches. Whatever the season, the pace here rewards staying a few nights rather than passing through.",
    ],
    listingCount: 134, comingSoon: false,
  },
  ucluelet: {
    slug: "ucluelet", name: "Ucluelet", regionSlug: "vancouver-island", heroPublicId: IMG.aerial,
    standfirst: "Tofino's quieter neighbour, wrapped by the Wild Pacific Trail.",
    overview: [
      "Ucluelet sits at the tip of the peninsula south of Tofino, wrapped by the Wild Pacific Trail. It keeps a working-harbour character and tends to feel calmer than its better-known neighbour.",
      "It makes a natural base for whale watching, wildlife tours, and long coastal walks, with easy access to Pacific Rim National Park just up the road.",
    ],
    listingCount: 158, comingSoon: false,
  },
};

/* ── Reads: v1.1 tree (Supabase → seed fallback) ─────────────────────────── */

export async function getRegions(): Promise<Region[]> {
  const s = getServerSupabase();
  if (s) {
    const { data, error } = await s
      .from("regions")
      .select("slug,name,hero_public_id,blurb,sort_order")
      .order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map((r) => ({
        slug: r.slug, name: r.name, heroPublicId: r.hero_public_id ?? IMG.coast,
        blurb: r.blurb ?? "", sortOrder: r.sort_order ?? 0,
      }));
    }
  }
  return SEED_REGIONS;
}

export async function getCity(slug: string): Promise<City | null> {
  const s = getServerSupabase();
  if (s) {
    const { data } = await s
      .from("destinations")
      .select("slug,name,region_slug,hero_public_id,standfirst,overview,listing_count,coming_soon")
      .eq("slug", slug)
      .maybeSingle();
    if (data && data.standfirst) {
      return {
        slug: data.slug, name: data.name, regionSlug: data.region_slug ?? null,
        heroPublicId: data.hero_public_id ?? IMG.coast, standfirst: data.standfirst ?? "",
        overview: data.overview ?? [], listingCount: data.listing_count ?? 0,
        comingSoon: data.coming_soon ?? false,
      };
    }
  }
  return SEED_CITIES[slug] ?? null;
}

export async function getCityCategories(citySlug: string): Promise<CityCategory[]> {
  const s = getServerSupabase();
  if (s) {
    const { data, error } = await s
      .from("city_categories")
      .select("city_slug,category_slug,intro,hero_public_id,sort_order")
      .eq("city_slug", citySlug)
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map((c) => ({
        citySlug: c.city_slug, categorySlug: c.category_slug, intro: c.intro ?? [],
        heroPublicId: c.hero_public_id ?? undefined, sortOrder: c.sort_order ?? 0,
      }));
    }
  }
  return SEED_CITY_CATEGORIES
    .filter((c) => c.citySlug === citySlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCityCategory(citySlug: string, categorySlug: string): Promise<CityCategory | null> {
  const all = await getCityCategories(citySlug);
  return all.find((c) => c.categorySlug === categorySlug) ?? null;
}

export async function getPlaces(citySlug: string, categorySlug?: string): Promise<Place[]> {
  const s = getServerSupabase();
  if (s) {
    let q = s.from("places").select("*").eq("city_slug", citySlug).eq("published", true);
    if (categorySlug) q = q.eq("category_slug", categorySlug);
    const { data, error } = await q.order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map((p) => ({
        id: p.id, slug: p.slug, citySlug: p.city_slug, categorySlug: p.category_slug,
        name: p.name, blurb: p.blurb ?? "", body: p.body ?? [], goodFor: p.good_for ?? [],
        goodToKnow: p.good_to_know ?? undefined, heroPublicId: p.hero_public_id ?? undefined,
        lat: p.lat ?? undefined, lng: p.lng ?? undefined, sortOrder: p.sort_order ?? 0,
      }));
    }
  }
  let out = SEED_PLACES.filter((p) => p.citySlug === citySlug);
  if (categorySlug) out = out.filter((p) => p.categorySlug === categorySlug);
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPlace(citySlug: string, categorySlug: string, slug: string): Promise<Place | null> {
  const all = await getPlaces(citySlug, categorySlug);
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getPhotos(
  citySlug: string,
  opts?: { categorySlug?: string; placeSlug?: string },
): Promise<Photo[]> {
  const s = getServerSupabase();
  if (s) {
    let q = s.from("photos").select("*").eq("city_slug", citySlug).eq("published", true);
    if (opts?.categorySlug) q = q.eq("category_slug", opts.categorySlug);
    if (opts?.placeSlug) q = q.eq("place_slug", opts.placeSlug);
    const { data, error } = await q.order("sort_order", { ascending: true });
    if (!error && data) {
      return data.map((p) => ({
        id: p.id, publicId: p.public_id, citySlug: p.city_slug ?? undefined,
        categorySlug: p.category_slug ?? undefined, placeSlug: p.place_slug ?? undefined,
        caption: p.caption ?? undefined, sourceUrl: p.source_url ?? undefined, sortOrder: p.sort_order ?? 0,
      }));
    }
  }
  // No SEED_PHOTOS yet: real corpus photography arrives via the ingest (Task 6), not hand-written here.
  return [];
}

export async function getExperiences(
  citySlug: string,
  opts?: { categorySlug?: string; placeSlug?: string },
): Promise<Experience[]> {
  const s = getServerSupabase();
  if (s) {
    let q = s.from("experiences").select("*").eq("city_slug", citySlug).eq("published", true);
    if (opts?.categorySlug) q = q.eq("category_slug", opts.categorySlug);
    if (opts?.placeSlug) q = q.eq("place_slug", opts.placeSlug);
    const { data, error } = await q.order("sort_order", { ascending: true });
    if (!error && data && data.length) {
      return data.map((e) => ({
        id: e.id, slug: e.slug, productLineSlug: e.product_line_slug, citySlug: e.city_slug ?? undefined,
        categorySlug: e.category_slug ?? undefined, placeSlug: e.place_slug ?? undefined, title: e.title,
        duration: e.duration ?? undefined, priceFrom: e.price_from != null ? Number(e.price_from) : undefined,
        currency: e.currency ?? "CAD", heroPublicId: e.hero_public_id ?? undefined,
        bookUrl: e.book_url ?? undefined, sortOrder: e.sort_order ?? 0,
      }));
    }
  }
  let out = SEED_EXPERIENCES.filter((e) => e.citySlug === citySlug);
  if (opts?.categorySlug) out = out.filter((e) => e.categorySlug === opts.categorySlug);
  if (opts?.placeSlug) out = out.filter((e) => e.placeSlug === opts.placeSlug);
  return out;
}

/* ── S1 structure: destination-first spine, guides ARE articles ─────────────
   Region tier and category-index pages are gone (owner-approved 2026-07-24).
   A GUIDE is one `city_categories` row; its `intro` IS the full article body.
   Reads below assemble a guide from intro + places + faqs + related articles,
   and roll categories up across cities for the things-to-do landing. */

/** Categories whose articles are trip-planning pieces, not "things to do":
    rendered in their own short row below the flat guide grid, never inside it. */
const PLANNING_CATEGORY_SLUGS = new Set(["when-to-go", "camping", "events"]);

/** Card summary for the flat `/[city]` grid. Same shape as `CategoryCard`'s
    props so the existing rail card can be reused without a new component. */
export type GuideSummary = {
  categorySlug: string;
  name: string;
  heroPublicId?: string;
  placeCount: number;
  bookableCount: number;
  state: "live" | "sister" | "soon" | "open";
  priceFrom?: number;
};

/**
 * The flat destination grid (spec: "ONE FLAT grid of guides, then a short
 * planning row, then stays"). Omits a guide only when it would ship empty:
 * a single intro block AND no product line mapped to the category at all
 * (matches `tofino/fishing`, which has 1 intro block but IS kept because
 * fishing charters are a real bookable line; a hypothetical thin category
 * with nothing to book would be dropped instead of rendering a dead card).
 */
export async function getGuidesForCity(citySlug: string): Promise<GuideSummary[]> {
  const [city, categories] = await Promise.all([getCity(citySlug), getCityCategories(citySlug)]);
  if (!city) return [];

  const summaries = await Promise.all(
    categories.map(async (c): Promise<GuideSummary | null> => {
      // A guide with no real body is a thin page whichever way you look at
      // it, so it never reaches the grid. Being bookable does not rescue it:
      // the booking surfaces on the destination page instead (see the sell
      // band on app/[city]/page.tsx), which is where the money belongs anyway.
      if (c.intro.length <= 1) return null;

      const [places, experiences] = await Promise.all([
        getPlaces(citySlug, c.categorySlug),
        getExperiences(citySlug, { categorySlug: c.categorySlug }),
      ]);
      const cta = resolveCta({ citySlug, cityName: city.name, categorySlug: c.categorySlug, experiences });
      const state: GuideSummary["state"] = cta.notify
        ? "soon"
        : cta.primary.kind === "sister-brand"
          ? "sister"
          : cta.primary.kind === "tours" && cta.primary.experiences.length > 0
            ? "live"
            : "open";
      const priceCandidates = cta.primary.experiences.map((e) => e.priceFrom).filter((n): n is number => n !== undefined);
      return {
        categorySlug: c.categorySlug,
        name: CATEGORY_BY_SLUG.get(c.categorySlug)?.name ?? c.categorySlug,
        heroPublicId: c.heroPublicId,
        placeCount: places.length,
        bookableCount: cta.primary.experiences.length,
        state,
        priceFrom: priceCandidates.length ? Math.min(...priceCandidates) : undefined,
      };
    }),
  );
  return summaries.filter((s): s is GuideSummary => s !== null);
}

/** Trip-planning pieces (when to go, camping, events): their own row below the grid. */
export async function getPlanningPieces(citySlug: string): Promise<Article[]> {
  const articles = await getArticlesForCity(citySlug);
  return articles.filter(
    (a) => a.categorySlug && PLANNING_CATEGORY_SLUGS.has(a.categorySlug) && !a.slug.endsWith("-faq"),
  );
}

export type Guide = {
  citySlug: string;
  cityName: string;
  categorySlug: string;
  categoryName: string;
  heroPublicId?: string;
  /** The full article body: a `city_categories.intro` row, real sizes (beaches 29, whale-watching 153, birding 338 blocks). */
  intro: ArticleBlock[];
  /** Sections within the guide (spec/beaches has 13, hiking 18); several categories
      (surfing, whale-watching, birding, fishing) have none and are intro-only. */
  places: Place[];
  /** Real ingested photography for this city+category. The guide body is pure
   *  text (no img blocks survived the ingest), so these are interleaved into
   *  it at render time. 284 photos exist across Tofino and Ucluelet. */
  photos: Photo[];
  faqs: Faq[];
  /** Other `articles` rows sharing this category (excluding the `-faq` carrier and empty bodies). */
  related: Article[];
  experiences: Experience[];
  cta: CtaResult;
};

/**
 * Assembles one guide article: intro (the city_categories row), its places
 * (rendered as sections, never separate pages), FAQ (the `*-faq` articles
 * row for this category), and related reading (other non-faq, non-empty
 * articles rows sharing the category, e.g. Ucluelet's four extra whale-
 * watching pieces).
 */
export async function getGuide(citySlug: string, categorySlug: string): Promise<Guide | null> {
  const [city, cityCategory] = await Promise.all([getCity(citySlug), getCityCategory(citySlug, categorySlug)]);
  if (!city || !cityCategory) return null;

  const [places, experiences, articlesForCategory, photos] = await Promise.all([
    getPlaces(citySlug, categorySlug),
    getExperiences(citySlug, { categorySlug }),
    getArticlesForCity(citySlug, categorySlug),
    getPhotos(citySlug, { categorySlug }),
  ]);

  const faqArticle = articlesForCategory.find((a) => a.slug.endsWith("-faq"));
  const related = articlesForCategory.filter((a) => !a.slug.endsWith("-faq") && (a.body?.length ?? 0) > 0);
  const cta = resolveCta({ citySlug, cityName: city.name, categorySlug, experiences });

  return {
    citySlug,
    cityName: city.name,
    categorySlug,
    categoryName: CATEGORY_BY_SLUG.get(categorySlug)?.name ?? categorySlug,
    heroPublicId: cityCategory.heroPublicId,
    intro: cityCategory.intro,
    places,
    photos,
    faqs: faqArticle?.faqs ?? [],
    related,
    experiences,
    cta,
  };
}

export type CategoryAcrossCities = {
  categorySlug: string;
  name: string;
  heroPublicId?: string;
  cities: { citySlug: string; cityName: string }[];
  cta: CtaResult;
  priceFrom?: number;
  state: "live" | "sister" | "soon" | "open";
};

/**
 * Rolls categories up across every navigable city for the `/things-to-do`
 * landing (spec: "a category card links straight to the destination's guide,
 * because with two towns there is nothing in between worth a page"). One
 * card per unique category slug, chip-listing every city that has a guide
 * for it; the CTA/price is resolved from the combined experiences of all
 * those cities since the taxonomy's product-line mapping is city-agnostic.
 */
export async function getCategoriesAcrossCities(): Promise<CategoryAcrossCities[]> {
  const destinations = await getDestinations();
  const perCity = await Promise.all(
    destinations.map(async (d) => {
      const categories = await getCityCategories(d.slug);
      if (categories.length === 0) return null;
      const city = await getCity(d.slug);
      return city ? { city, categories } : null;
    }),
  );

  type Entry = { categorySlug: string; heroPublicId?: string; cities: { citySlug: string; cityName: string }[] };
  const bySlug = new Map<string, Entry>();
  for (const row of perCity) {
    if (!row) continue;
    for (const c of row.categories) {
      const entry = bySlug.get(c.categorySlug) ?? { categorySlug: c.categorySlug, heroPublicId: c.heroPublicId, cities: [] };
      entry.cities.push({ citySlug: row.city.slug, cityName: row.city.name });
      if (!entry.heroPublicId) entry.heroPublicId = c.heroPublicId;
      bySlug.set(c.categorySlug, entry);
    }
  }

  const results = await Promise.all(
    Array.from(bySlug.values()).map(async (entry): Promise<CategoryAcrossCities> => {
      const experiencesByCity = await Promise.all(
        entry.cities.map((c) => getExperiences(c.citySlug, { categorySlug: entry.categorySlug })),
      );
      const experiences = experiencesByCity.flat();
      const firstCity = entry.cities[0];
      const cta = resolveCta({
        citySlug: firstCity.citySlug,
        cityName: firstCity.cityName,
        categorySlug: entry.categorySlug,
        experiences,
      });
      const state: CategoryAcrossCities["state"] = cta.notify
        ? "soon"
        : cta.primary.kind === "sister-brand"
          ? "sister"
          : cta.primary.kind === "tours" && cta.primary.experiences.length > 0
            ? "live"
            : "open";
      const priceCandidates = cta.primary.experiences.map((e) => e.priceFrom).filter((n): n is number => n !== undefined);
      return {
        categorySlug: entry.categorySlug,
        name: CATEGORY_BY_SLUG.get(entry.categorySlug)?.name ?? entry.categorySlug,
        heroPublicId: entry.heroPublicId,
        cities: entry.cities,
        cta,
        priceFrom: priceCandidates.length ? Math.min(...priceCandidates) : undefined,
        state,
      };
    }),
  );

  return results.sort(
    (a, b) => (CATEGORY_BY_SLUG.get(a.categorySlug)?.sortOrder ?? 999) - (CATEGORY_BY_SLUG.get(b.categorySlug)?.sortOrder ?? 999),
  );
}

/* ── Bulk index reads ──────────────────────────────────────────────────────
   /destinations needs a line of numbers for every town. Doing that through
   getGuidesForCity per destination fanned out to hundreds of sequential
   queries and cost eighteen seconds to first byte. These read the whole set
   at once instead. ─────────────────────────────────────────────────────── */

export type CitySummary = {
  slug: string;
  guides: { categorySlug: string; name: string; heroPublicId?: string; placeCount: number }[];
  placeCount: number;
  articleCount: number;
  stayFrom?: number;
};

/** Every town's counts in four queries, keyed by city slug. */
export async function getCitySummaries(): Promise<Map<string, CitySummary>> {
  const out = new Map<string, CitySummary>();
  const s = getServerSupabase();
  if (!s) return out;

  const [cc, pl, ls, ar] = await Promise.all([
    s.from("city_categories").select("city_slug,category_slug,hero_public_id,intro").eq("published", true).order("sort_order"),
    s.from("places").select("city_slug,category_slug").eq("published", true),
    s.from("listings").select("destination_slug,price_per_night").eq("published", true),
    s.from("articles").select("city_slugs,body").eq("published", true),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const placeCounts = new Map<string, number>();
  for (const p of (pl.data ?? []) as any[]) {
    const k = `${p.city_slug}:${p.category_slug}`;
    placeCounts.set(k, (placeCounts.get(k) ?? 0) + 1);
  }
  const priceFrom = new Map<string, number>();
  for (const l of (ls.data ?? []) as any[]) {
    if (!l.destination_slug || l.price_per_night == null) continue;
    const cur = priceFrom.get(l.destination_slug);
    if (cur === undefined || l.price_per_night < cur) priceFrom.set(l.destination_slug, l.price_per_night);
  }
  const articleCounts = new Map<string, number>();
  for (const a of (ar.data ?? []) as any[]) {
    if (!(a.body?.length)) continue;
    for (const c of a.city_slugs ?? []) articleCounts.set(c, (articleCounts.get(c) ?? 0) + 1);
  }

  for (const row of (cc.data ?? []) as any[]) {
    // A guide with a single intro block is a stub, the same rule the grid uses.
    if ((row.intro?.length ?? 0) <= 1) continue;
    const city = row.city_slug as string;
    const entry = out.get(city) ?? { slug: city, guides: [], placeCount: 0, articleCount: 0 };
    const places = placeCounts.get(`${city}:${row.category_slug}`) ?? 0;
    entry.guides.push({
      categorySlug: row.category_slug,
      name: CATEGORY_BY_SLUG.get(row.category_slug)?.name ?? row.category_slug,
      heroPublicId: row.hero_public_id ?? undefined,
      placeCount: places,
    });
    entry.placeCount += places;
    out.set(city, entry);
  }
  for (const [city, entry] of out) {
    entry.stayFrom = priceFrom.get(city);
    entry.articleCount = articleCounts.get(city) ?? 0;
  }
  return out;
}

/**
 * Articles fit to show on an index: a real body, a photograph and a standfirst.
 * One query, ordered newest first, so /destinations does not fan out per town.
 */
export async function getReadingArticles(limit = 24): Promise<Article[]> {
  const s = getServerSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("articles").select("*").eq("published", true)
    .not("hero_public_id", "is", null).order("sort_order").limit(200);
  if (error || !data) return [];
  return data
    .filter((a: Record<string, unknown>) => ((a.body as unknown[])?.length ?? 0) > 0 && !String(a.slug).endsWith("-faq"))
    .slice(0, limit)
    .map(mapArticleRow);
}
