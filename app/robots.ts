import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "../scripts/lib/routes.mjs";

/* /not-found is left crawlable on purpose: it carries its own noindex, which a
   crawler can only honour if it is allowed to fetch the page. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/prototype/_", "/ideation/"] }],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
