import type { MetadataRoute } from "next";
import { ROUTES, canonicalFor, NOINDEX_ROUTES } from "../scripts/lib/routes.mjs";

/* Every routed page except the noindex ones, from the one URL map. */
export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(ROUTES as Record<string, string>)
    .filter((route) => !NOINDEX_ROUTES.includes(route))
    .map((route) => ({ url: canonicalFor(route) }));
}
