/**
 * JSON-LD builders for the SEO contract in
 * docs/superpowers/specs/2026-07-27-destinations-experience-design.md section 6.
 * Pure: every builder takes plain data and returns a plain object, so the
 * shapes are unit-testable without rendering a page. Builders that would emit
 * an empty collection return null instead, because an empty ItemList or
 * FAQPage is worse than none at all.
 */
const CTX = "https://schema.org";

export function breadcrumbList(items: { name: string; url?: string }[]) {
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}

export function touristDestination(
  node: { name: string; lat?: number; lng?: number },
  url: string,
  description?: string,
) {
  return {
    "@context": CTX,
    "@type": "TouristDestination",
    name: node.name,
    url,
    ...(description ? { description } : {}),
    ...(node.lat !== undefined && node.lng !== undefined
      ? { geo: { "@type": "GeoCoordinates", latitude: node.lat, longitude: node.lng } }
      : {}),
  };
}

export function itemList(items: { name: string; url: string }[], name?: string) {
  if (!items.length) return null;
  return {
    "@context": CTX,
    "@type": "ItemList",
    ...(name ? { name } : {}),
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem", position: i + 1, name: it.name, url: it.url,
    })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  if (!faqs.length) return null;
  return {
    "@context": CTX,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function articleLd(a: {
  title: string;
  url: string;
  published?: string;
  updated?: string;
  author?: string;
  image?: string;
}) {
  return {
    "@context": CTX,
    "@type": "Article",
    headline: a.title,
    url: a.url,
    ...(a.image ? { image: a.image } : {}),
    ...(a.published ? { datePublished: a.published } : {}),
    ...(a.updated ? { dateModified: a.updated } : {}),
    author: { "@type": "Organization", name: a.author ?? "Arc Trips" },
    publisher: { "@type": "Organization", name: "Arc Trips" },
  };
}
