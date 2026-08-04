const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "djqswlfat";
const BASE = `https://res.cloudinary.com/${CLOUD}/image/upload`;

/**
 * The canonical width ladder. EVERY width that reaches a Cloudinary URL must be
 * one of these rungs — see `snapWidth`. Keep identical to the copies in
 * Website-Builder/src/lib/cloudinary.ts, Arctrips-Splash-Page and arc-auto-pilot:
 * all four repos share cloud `djqswlfat`, so a rung added in one repo only is a
 * rung the other three will not reuse.
 */
export const IMAGE_WIDTHS = [96, 160, 240, 360, 540, 768, 1024, 1280, 1600, 1920, 2560, 3840];

/**
 * Snap an arbitrary width up to the nearest ladder rung.
 *
 * Cloudinary bills one transformation credit per distinct derived variant, keyed
 * on the exact transformation string, so a free-form `w` turns every call site's
 * pixel guess into a separate billable asset. The 2026-08-03 audit found 87
 * distinct widths on this cloud, 79 of them within 10% of another width — the
 * single largest line on the bill. Snaps UP so an image is never rendered soft.
 */
export function snapWidth(width: number): number {
  return IMAGE_WIDTHS.find((w) => w >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

/**
 * Build a Cloudinary delivery URL with auto format/quality transforms.
 * Pass a Cloudinary public ID (not a full URL).
 *
 * One deliberate omission, from the 2026-08-03 credit audit:
 *
 * - No `dpr_auto`. It needs Client-Hints to mean anything, and without them
 *   Cloudinary resolves it to `dpr_1.0` — as a SEPARATE derived asset. Every
 *   variant was being generated and billed twice for no visual difference.
 * `q_auto:best` is KEPT deliberately. Dropping it to `q_auto` measured 35% fewer
 * bytes and was visually indistinguishable at 1:1 (PSNR 36.4 dB on dense water
 * texture), but it is still a change to what live sites serve, and the width
 * ladder above is where the credit saving actually comes from. If bandwidth ever
 * needs trimming, this is the cheapest lever and the evidence says it is safe.
 */
export function cld(
  publicId: string,
  opts?: { w?: number; h?: number; fit?: "fill" | "limit" },
): string {
  const t: string[] = ["f_auto", "q_auto:best"];
  const w = opts?.w ? snapWidth(opts.w) : undefined;
  // When both dimensions are given the pair defines a CROP, so `h` has to move
  // with the snapped `w` or the aspect ratio changes: snapping w_420,h_315 (4:3)
  // to w_540 while leaving h_315 would silently re-crop it to 12:7. Scale h by
  // the same factor and the framing is identical, just on a ladder rung.
  const h = opts?.h && opts?.w && w ? Math.round(opts.h * (w / opts.w)) : opts?.h;
  if (w) t.push(`w_${w}`);
  if (h) t.push(`h_${h}`);
  if (opts?.fit === "fill") t.push("c_fill");
  else if (opts?.fit === "limit") t.push("c_limit");
  return `${BASE}/${t.join(",")}/${publicId}`;
}

/** placehold.net fallback for slots without real imagery yet (e.g. w=600,h=400). */
export function placeholder(w: number, h: number): string {
  return `https://placehold.net/${w}x${h}.png`;
}

/**
 * Shared Arc Trips Cloudinary public IDs used as neutral placeholders until the
 * real property/area photography (New Articles corpus) is ingested. All live
 * under cloud `djqswlfat`.
 */
export const IMG = {
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
} as const;
