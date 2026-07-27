import { SITE } from "@/app/lib/sitemap-data";

export const revalidate = 3600;

export async function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE}/sitemap-destinations.xml`,
    `Sitemap: ${SITE}/sitemap-travel-guides.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
