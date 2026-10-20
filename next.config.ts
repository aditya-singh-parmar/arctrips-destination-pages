import type { NextConfig } from "next";
import { ROUTES, ALIASES, fileToPath } from "./scripts/lib/routes.mjs";

const entries = Object.entries(ROUTES as Record<string, string>);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.3", "localhost"],

  /**
   * The pages are static files in public/prototype; the URLs are the nested
   * tree in scripts/lib/routes.mjs. Rewrites (not redirects) serve them, so the
   * clean route is the URL the visitor keeps. Every page now references its
   * CSS, JS and images as `/prototype/...`, which is what makes this safe: the
   * old `/` redirect existed only because relative asset paths 404'd when a
   * page was served from a different depth.
   */
  async rewrites() {
    return [
      ...entries.map(([file, route]) => ({ source: route, destination: fileToPath(file) })),
      /* Non-canonical addresses that serve a page. Rewrites, never redirects: the
         URL PRD forbids redirects. The page's canonical tag names the real route. */
      ...Object.entries(ALIASES as Record<string, string>).map(([source, file]) => ({
        source,
        destination: fileToPath(file),
      })),
      /* Design exploration, not a site page: deliberately outside ROUTES so the
         QA gates and the route sweep do not treat a mockup as a destination. */
      { source: "/ideation/nav", destination: "/ideation/nav/index.html" },
    ];
  },

  /**
   * The static files are also reachable at /prototype/<file>.html because they
   * live in public/. Send those to the route so a page has one address. The old
   * flat routes (/tofino, /tofino/hiking, ...) are deliberately NOT redirected:
   * the owner ruled on 2026-10-20 that prototype URLs may break.
   */
  async redirects() {
    return entries.map(([file, route]) => ({
      source: fileToPath(file),
      destination: route,
      permanent: true,
    }));
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
