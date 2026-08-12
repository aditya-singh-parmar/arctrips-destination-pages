import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.3", "localhost"],

  /**
   * The site is the static prototype in public/prototype. This has to be a
   * redirect, not a rewrite: every page references `_system.css`, `_nav.js`
   * and its images relatively, so serving index.html at `/` 404s all of them.
   */
  async redirects() {
    return [{ source: "/", destination: "/prototype/index.html", permanent: false }];
  },

  /**
   * The Next.js marketplace + destination-tree app was removed on 2026-08-12;
   * the prototype replaced it. Its URLs no longer exist, so the deep-tree
   * redirects that used to live here went with it. Every internal link now
   * lives inside /prototype.
   */
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
