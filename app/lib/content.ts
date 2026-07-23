import { getServerSupabase } from "./supabase";
import { IMG } from "./cloudinary";

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
export type Article = {
  slug: string;
  destinationSlug: string;
  title: string;
  category: string;
  heroPublicId: string;
  excerpt: string;
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

export async function getArticles(destinationSlug: string): Promise<Article[]> {
  const s = getServerSupabase();
  if (s) {
    const { data } = await s.from("articles").select("*").eq("destination_slug", destinationSlug).order("sort_order", { ascending: true });
    if (data && data.length) {
      return data.map((a) => ({ slug: a.slug, destinationSlug: a.destination_slug, title: a.title, category: a.category ?? "", heroPublicId: a.hero_public_id ?? IMG.coast, excerpt: a.excerpt ?? "" }));
    }
  }
  return SEED_ARTICLES.filter((a) => a.destinationSlug === destinationSlug);
}

export async function getArticle(destinationSlug: string, articleSlug: string): Promise<Article | null> {
  const all = await getArticles(destinationSlug);
  return all.find((a) => a.slug === articleSlug) ?? null;
}

export async function getAllAreaSlugs(): Promise<string[]> {
  const dests = await getDestinations();
  return dests.filter((d) => !d.comingSoon).map((d) => d.slug);
}
