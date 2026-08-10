import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.3", "localhost"],

  /**
   * Next would answer a trailing slash with a 308. The taxonomy PRD forbids
   * redirects, so middleware.ts rewrites to the canonical path instead and
   * this turns the built-in redirect off.
   */
  skipTrailingSlashRedirect: true,

  /**
   * Every rule here covers a URL shipped BEFORE the tree took its current
   * shape: the S1 restructure of 2026-07-24, the tier layout before it, and
   * the country segment removed on 2026-07-30 (docs/qa/bc-root-contract.md).
   * No URL inside the tree ever redirects; archived places return 410.
   *
   * These must all stay specific. The old generic rules (/:city/:category,
   * /destinations/:city) would swallow the tree itself, and for the same
   * reason the country rules below match the literal `canada` segment rather
   * than `/destinations/:country/:rest*`, which would match `/destinations/bc/
   * vancouver-island` and redirect the tree into itself.
   */
  async redirects() {
    const ISLAND = "/destinations/bc/vancouver-island";
    const CITIES = ["tofino", "ucluelet"];
    return [
      // The country segment is gone. Both trees keep every deeper segment.
      { source: "/destinations/canada", destination: "/destinations", permanent: true },
      { source: "/destinations/canada/:rest*", destination: "/destinations/:rest*", permanent: true },
      { source: "/travel-guides/canada", destination: "/travel-guides", permanent: true },
      { source: "/travel-guides/canada/:rest*", destination: "/travel-guides/:rest*", permanent: true },

      { source: "/destinations/vancouver-island", destination: ISLAND, permanent: true },
      { source: "/destinations/sea-to-sky", destination: "/destinations/bc/sea-to-sky", permanent: true },
      // Flat S1 city URLs move under the deep tree.
      ...CITIES.flatMap((city) => [
        { source: `/${city}`, destination: `${ISLAND}/${city}`, permanent: true },
        { source: `/${city}/things-to-do`, destination: `${ISLAND}/${city}/things-to-do`, permanent: true },
        { source: `/${city}/guides`, destination: `${ISLAND}/${city}`, permanent: true },
        { source: `/${city}/gallery`, destination: `${ISLAND}/${city}`, permanent: true },
        { source: `/${city}/:category`, destination: `${ISLAND}/${city}/things-to-do/:category`, permanent: true },
        // Place pages were folded into their guide, e.g. /tofino/beaches/long-beach.
        { source: `/${city}/:category/:place`, destination: `${ISLAND}/${city}/things-to-do/:category`, permanent: true },
      ]),
    ];
  },
  images: {
    // Cloudinary already applies f_auto/q_auto/resize/dpr, so Next's optimizer
    // is redundant here and only adds a slow re-optimization pass. Serve the
    // Cloudinary URLs directly for crisp, fast loads on dev and prod.
    unoptimized: true,
    qualities: [75, 82, 85, 88],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/du9doarye/**" },
      // Fallback placeholder source (placehold.net) for slots without real imagery yet.
      { protocol: "https", hostname: "placehold.net" },
    ],
  },
};

export default nextConfig;
