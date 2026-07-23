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
