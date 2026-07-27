/**
 * The listings table is seeded placeholder inventory and two things in it are
 * wrong on screen:
 *   1. Five rows carry a location that contradicts their destination, so a
 *      Tofino page showed a stay in "Canmore, Alberta".
 *   2. Several rows use a landscape or an activity photograph as the
 *      accommodation image, so a cabin card showed a whale tail or five
 *      people holding halibut.
 * This repairs the location from the destination, and repoints any hero that
 * is not accommodation photography at one that is. It does not invent
 * inventory: real photography has to come with real listings.
 *
 * Run: node --env-file=.env.local scripts/fix-listings.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Cloudinary IDs that actually depict somewhere you sleep. */
const STAY_PHOTOS = [
  "arc-trips/curated-cabin",
  "arcstudio/zczetpngmabknruslfwn",
  "arcstudio/mg8epie7gzlpfb1bn7jo",
];
/** Landscapes and activity shots that must never front an accommodation card. */
const NOT_A_STAY = new Set([
  "arcstudio/wnrrcrf4lnalgzbjvsz8",        // humpback tail
  "arcstudio/galleries/dayhike-trail-1",   // trail
  "arcstudio/njajgzfo6gdfxbpxmtst",        // rainforest boardwalk
  "andrea-davis-44f42VRbGQg-unsplash_q9h9op",
  "arc-trips/pillar-connection",
  "arc-trips/founding-key",
]);

const PROVINCE = {
  tofino: "British Columbia", ucluelet: "British Columbia", victoria: "British Columbia",
  whistler: "British Columbia", squamish: "British Columbia", nelson: "British Columbia",
};
const title = (s) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const { data: rows, error } = await sb.from("listings").select("id,title,location,destination_slug,hero_public_id");
if (error) throw new Error(error.message);

let fixedLoc = 0, fixedImg = 0, i = 0;
for (const l of rows) {
  const patch = {};
  const city = l.destination_slug;
  if (city) {
    const want = `${title(city)}, ${PROVINCE[city] || "British Columbia"}`;
    if (l.location !== want) { patch.location = want; fixedLoc++; }
  }
  if (!l.hero_public_id || NOT_A_STAY.has(l.hero_public_id)) {
    patch.hero_public_id = STAY_PHOTOS[i++ % STAY_PHOTOS.length];
    fixedImg++;
  }
  if (!Object.keys(patch).length) continue;
  const { error: e } = await sb.from("listings").update(patch).eq("id", l.id);
  if (e) throw new Error(`${l.title}: ${e.message}`);
}
console.log(`listings: ${fixedLoc} locations corrected, ${fixedImg} heroes repointed at accommodation photography`);
