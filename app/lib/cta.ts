/**
 * The CTA engine. Pure resolver, no I/O: the button on any category or place
 * page is derived from data, never hardcoded. Launching whale watching tours
 * is a status change on one `product_lines` row.
 * Spec section 5 is the contract; see also app/lib/cta.test.ts.
 */
import { CATEGORY_BY_SLUG, CATEGORY_PRODUCTS, PRODUCT_LINES } from "./taxonomy";
import type { Experience } from "./content";

export type CtaKind = "tours" | "sister-brand" | "stays";

export type CtaBlock = {
  kind: CtaKind;
  productLineSlug: string;
  label: string;
  /** True when the booking happens off Arc Trips (e.g. ArcTrips Fishing). */
  external: boolean;
  href?: string;
  experiences: Experience[];
  isPrimary: true;
};

export type NotifyBlock = {
  kind: "notify";
  productLineSlug: string;
  label: string;
  isPrimary: false;
};

export type CtaResult = {
  /** Never undefined: stays is always available, so no page can dead-end. */
  primary: CtaBlock;
  /** Present only when the category's mapped product line is coming soon. */
  notify?: NotifyBlock;
};

export type CtaInput = {
  citySlug: string;
  cityName: string;
  categorySlug: string;
  experiences: Experience[];
};

function staysBlock(input: CtaInput, label: string): CtaBlock {
  const stays = PRODUCT_LINES.find((p) => p.slug === "stays");
  return {
    kind: "stays",
    productLineSlug: "stays",
    label,
    external: false,
    href: stays?.externalUrl,
    experiences: input.experiences.filter((e) => e.productLineSlug === "stays"),
    isPrimary: true,
  };
}

/**
 * Resolution ladder (spec section 5):
 * 1. Highest-priority `live` product line mapped to the category becomes primary.
 * 2. If the mapped line is `coming_soon`, emit a notify block for it (never primary)
 *    and promote stays to primary, scoped to the category.
 * 3. If nothing is mapped, primary is stays with the plain label.
 */
export function resolveCta(input: CtaInput): CtaResult {
  const mappedSlugs = CATEGORY_PRODUCTS[input.categorySlug] ?? [];
  const mappedLines = mappedSlugs
    .map((slug) => PRODUCT_LINES.find((p) => p.slug === slug))
    .filter((p): p is (typeof PRODUCT_LINES)[number] => Boolean(p));

  const live = mappedLines.find((p) => p.status === "live");
  if (live) {
    const kind: CtaKind = live.brand !== "arctrips" ? "sister-brand" : "tours";
    const label = kind === "sister-brand" ? "Book a charter on ArcTrips Fishing" : `Book ${live.name}`;
    return {
      primary: {
        kind,
        productLineSlug: live.slug,
        label,
        external: kind === "sister-brand",
        href: live.externalUrl,
        experiences: input.experiences.filter((e) => e.productLineSlug === live.slug),
        isPrimary: true,
      },
    };
  }

  if (mappedLines.length > 0) {
    const comingSoon = mappedLines[0];
    const category = CATEGORY_BY_SLUG.get(input.categorySlug);
    const categoryName = (category?.name ?? input.categorySlug).toLowerCase();
    return {
      primary: staysBlock(input, `Book a stay for ${categoryName} season`),
      notify: {
        kind: "notify",
        productLineSlug: comingSoon.slug,
        label: "Notify me when tours open",
        isPrimary: false,
      },
    };
  }

  return { primary: staysBlock(input, "Book dates") };
}
