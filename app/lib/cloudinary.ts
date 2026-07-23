const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "djqswlfat";
const BASE = `https://res.cloudinary.com/${CLOUD}/image/upload`;

/**
 * Build a Cloudinary delivery URL with auto format/quality/dpr transforms.
 * Pass a Cloudinary public ID (not a full URL).
 */
export function cld(
  publicId: string,
  opts?: { w?: number; h?: number; fit?: "fill" | "limit" },
): string {
  const t: string[] = ["f_auto", "q_auto:best", "dpr_auto"];
  if (opts?.w) t.push(`w_${opts.w}`);
  if (opts?.h) t.push(`h_${opts.h}`);
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
