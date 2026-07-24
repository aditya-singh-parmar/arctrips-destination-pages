import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.3", "localhost"],
  /**
   * The S1 restructure (2026-07-24) removed the region tier, the category
   * index layer, place pages and the things-to-do/guides/gallery split.
   * Anything shared before that still needs to land somewhere sensible.
   * Order matters: the region rule must precede the generic city rule,
   * otherwise /destinations/vancouver-island rewrites to a city that
   * does not exist.
   */
  async redirects() {
    return [
      { source: "/destinations/vancouver-island", destination: "/destinations", permanent: true },
      { source: "/destinations/sea-to-sky", destination: "/destinations", permanent: true },
      { source: "/destinations/:city", destination: "/:city", permanent: true },
      { source: "/:city/things-to-do", destination: "/:city", permanent: true },
      { source: "/:city/guides", destination: "/:city", permanent: true },
      { source: "/:city/gallery", destination: "/:city", permanent: true },
      // Place pages folded into their guide, e.g. /tofino/beaches/long-beach.
      { source: "/:city/:category/:place", destination: "/:city/:category", permanent: true },
    ];
  },
  images: {
    // Cloudinary already applies f_auto/q_auto/resize/dpr, so Next's optimizer
    // is redundant here and only adds a slow re-optimization pass. Serve the
    // Cloudinary URLs directly for crisp, fast loads on dev and prod.
    unoptimized: true,
    qualities: [75, 82, 85, 88],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/djqswlfat/**" },
      // Fallback placeholder source (placehold.net) for slots without real imagery yet.
      { protocol: "https", hostname: "placehold.net" },
    ],
  },
};

export default nextConfig;
