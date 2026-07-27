/**
 * Finite category taxonomy and product-line definitions for the v1.1 tree
 * (Region > City > Category > Place). Single source of truth for the seed
 * script and every browse/tab-bar/CTA component — see
 * docs/superpowers/specs/2026-07-24-destination-pages-v1.1-design.md section 8.
 */

export type ThemeSlug =
  | "on-the-water" | "wildlife-nature" | "on-land"
  | "food-drink" | "culture-landmarks" | "plan-your-trip";

export const THEMES: { slug: ThemeSlug; name: string }[] = [
  { slug: "on-the-water",     name: "On the water" },
  { slug: "wildlife-nature",  name: "Wildlife & nature" },
  { slug: "on-land",          name: "On land" },
  { slug: "food-drink",       name: "Food & drink" },
  { slug: "culture-landmarks", name: "Culture & landmarks" },
  { slug: "plan-your-trip",   name: "Plan your trip" },
];

export type Category = { slug: string; name: string; theme: ThemeSlug; sortOrder: number };

export const CATEGORIES: Category[] = [
  { slug: "beaches",             name: "Beaches",                 theme: "on-the-water",     sortOrder: 10 },
  { slug: "surfing",             name: "Surfing",                 theme: "on-the-water",     sortOrder: 20 },
  { slug: "kayaking",            name: "Kayaking & paddling",     theme: "on-the-water",     sortOrder: 30 },
  { slug: "fishing",             name: "Fishing",                 theme: "on-the-water",     sortOrder: 40 },
  { slug: "boating",             name: "Boating & sailing",       theme: "on-the-water",     sortOrder: 50 },
  { slug: "hot-springs",         name: "Hot springs",             theme: "on-the-water",     sortOrder: 60 },
  { slug: "whale-watching",      name: "Whale watching",          theme: "wildlife-nature",  sortOrder: 70 },
  { slug: "birding",             name: "Birding & wildlife",      theme: "wildlife-nature",  sortOrder: 80 },
  { slug: "storm-watching",      name: "Storm watching",          theme: "wildlife-nature",  sortOrder: 90 },
  { slug: "parks",               name: "Parks & rainforest",      theme: "wildlife-nature",  sortOrder: 100 },
  { slug: "hiking",              name: "Hiking & trails",         theme: "on-land",          sortOrder: 110 },
  { slug: "mountain-biking",     name: "Mountain biking",         theme: "on-land",          sortOrder: 120 },
  { slug: "skiing",              name: "Skiing & snowboarding",   theme: "on-land",          sortOrder: 130 },
  { slug: "camping",             name: "Camping",                 theme: "on-land",          sortOrder: 140 },
  { slug: "restaurants",         name: "Restaurants",             theme: "food-drink",       sortOrder: 150 },
  { slug: "markets",             name: "Markets & local food",    theme: "food-drink",       sortOrder: 160 },
  { slug: "breweries",           name: "Breweries & tasting",     theme: "food-drink",       sortOrder: 170 },
  { slug: "landmarks",           name: "Landmarks & scenic spots", theme: "culture-landmarks", sortOrder: 180 },
  { slug: "arts-history",        name: "Arts, history & museums", theme: "culture-landmarks", sortOrder: 190 },
  { slug: "events",              name: "Events & festivals",      theme: "culture-landmarks", sortOrder: 200 },
  { slug: "when-to-go",          name: "When to go",              theme: "plan-your-trip",   sortOrder: 210 },
  { slug: "getting-around",      name: "Getting around",          theme: "plan-your-trip",   sortOrder: 220 },
];

export type ProductStatus = "live" | "coming_soon";
export type ProductLine = {
  slug: string; name: string; brand: "arctrips" | "arctrips-fishing";
  status: ProductStatus; externalUrl?: string; blurb: string;
};

export const PRODUCT_LINES: ProductLine[] = [
  { slug: "stays", name: "Stays", brand: "arctrips", status: "live",
    blurb: "Cabins, cottages and lodges booked on Arc Trips." },
  { slug: "fishing-charters", name: "Fishing charters", brand: "arctrips-fishing", status: "live",
    externalUrl: "https://arctripsfishing.com",
    blurb: "Salmon and halibut charters, run and booked on our fishing site." },
  { slug: "whale-watching-tours", name: "Whale watching tours", brand: "arctrips", status: "coming_soon",
    blurb: "Grey whale and humpback trips, coming to Arc Trips." },
  { slug: "kayaking-tours", name: "Kayaking tours", brand: "arctrips", status: "coming_soon",
    blurb: "Guided paddles, coming to Arc Trips." },
  { slug: "hot-springs-tours", name: "Hot springs tours", brand: "arctrips", status: "coming_soon",
    blurb: "Boat access hot springs trips, coming to Arc Trips." },
];

/** category slug to product line slugs, highest priority first. Stays is implicit everywhere. */
export const CATEGORY_PRODUCTS: Record<string, string[]> = {
  fishing:         ["fishing-charters"],
  boating:         ["fishing-charters"],
  "whale-watching": ["whale-watching-tours"],
  birding:         ["whale-watching-tours"],
  kayaking:        ["kayaking-tours"],
  "hot-springs":   ["hot-springs-tours"],
};

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** Spec section 8: chips at 10 or fewer, theme grids above that. */
export const THEME_GRID_THRESHOLD = 10;

/**
 * Months each category is worth doing, 1 to 12. Drives the "Best time to go"
 * module (PRD 6.4), the best-months indicator on category cards, and seasonal
 * ordering of the grid (AC 48: storm watching above whale watching in
 * December, below it in April).
 *
 * The data lives in best-months.json because the seed scripts are plain .mjs
 * and cannot import TypeScript. One file, no drift.
 *
 * These are per-category defaults. `destination_categories.best_months`
 * overrides them per town once an editor sets it.
 */
import BEST_MONTHS from "./best-months.json";

export const CATEGORY_BEST_MONTHS: Record<string, number[]> = BEST_MONTHS;

export const MONTH_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export const MONTH_NAME = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Seasonal rank for ordering a category grid in a given month. Categories in
 * season sort first, then by how central the month sits in their season, then
 * by the taxonomy order. Pure so it can be unit-tested (AC 48).
 */
export function seasonalRank(bestMonths: number[], month: number): number {
  if (!bestMonths.length) return 1;
  if (!bestMonths.includes(month)) return 1;
  // Peak of the season scores best: distance from the middle of the run.
  const centre = bestMonths[Math.floor(bestMonths.length / 2)];
  const dist = Math.min(Math.abs(centre - month), 12 - Math.abs(centre - month));
  return -100 + dist;
}
