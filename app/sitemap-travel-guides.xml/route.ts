import { guideEntries, renderSitemap, SITEMAP_MAX_URLS } from "@/app/lib/sitemap-data";

export const revalidate = 60;

export async function GET() {
  const entries = await guideEntries();
  if (entries.length > SITEMAP_MAX_URLS) {
    console.warn(
      `sitemap-travel-guides: ${entries.length} URLs exceeds ${SITEMAP_MAX_URLS}, split into an indexed set`,
    );
  }
  return new Response(renderSitemap(entries.slice(0, SITEMAP_MAX_URLS)), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
