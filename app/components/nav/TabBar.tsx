import Link from "next/link";
import type { City, CityCategory } from "@/app/lib/content";
import type { CtaResult } from "@/app/lib/cta";
import { resolveCta } from "@/app/lib/cta";
import { CATEGORY_BY_SLUG, CATEGORY_PRODUCTS } from "@/app/lib/taxonomy";

type Tab = { key: string; label: string; href: string; dot?: boolean };

const MAX_TABS = 8;
/** Overview, Things to do, Where to stay, Guides, Photos: the fixed frame around promoted categories. */
const FIXED_TAB_COUNT = 5;

/**
 * Sticky tab bar, spec section 6 composition rule: Overview, Things to do,
 * Where to stay, then every category mapped to a non-Stays product line
 * (promoted because that's where the money is), then Guides, Photos. Capped
 * at 8 tabs; the Book button lives at the right edge of the same bar so the
 * primary CTA never needs a sidebar or a floating dock on desktop.
 *
 * `active` is matched against each tab's `key` ("overview" | "things-to-do" |
 * "stays" | a category slug | "guides" | "photos"): pages pass whichever
 * key corresponds to the current route.
 */
export function TabBar({
  city,
  categories,
  active,
  cta,
}: {
  city: City;
  categories: CityCategory[];
  active: string;
  cta: CtaResult;
}) {
  const promotedSlots = Math.max(0, MAX_TABS - FIXED_TAB_COUNT);
  const promoted = categories
    .filter((c) => (CATEGORY_PRODUCTS[c.categorySlug] ?? []).length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, promotedSlots);

  const tabs: Tab[] = [
    { key: "overview", label: "Overview", href: `/${city.slug}` },
    { key: "things-to-do", label: "Things to do", href: `/${city.slug}/things-to-do` },
    { key: "stays", label: "Where to stay", href: `/${city.slug}#stays` },
    ...promoted.map((c): Tab => {
      const name = CATEGORY_BY_SLUG.get(c.categorySlug)?.name ?? c.categorySlug;
      const resolved = resolveCta({
        citySlug: city.slug,
        cityName: city.name,
        categorySlug: c.categorySlug,
        experiences: [],
      });
      return { key: c.categorySlug, label: name, href: `/${city.slug}/${c.categorySlug}`, dot: Boolean(resolved.notify) };
    }),
    { key: "guides", label: "Guides", href: `/${city.slug}/guides` },
    { key: "photos", label: "Photos", href: `/${city.slug}/gallery` },
  ];

  const book = cta.primary;
  // Internal CTAs (stays, in-house tours) don't carry an href yet, since
  // booking flow routing is out of scope here; land on the page's own
  // "Where to stay" anchor rather than a dead link. Sister-brand CTAs always
  // carry their externalUrl from product_lines.
  const bookHref = book.href ?? (book.kind === "sister-brand" ? "#" : `/${city.slug}#stays`);

  return (
    <div className="tabbar">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={isActive ? "tabbar__link tabbar__link--on" : "tabbar__link"}
          >
            {tab.label}
            {tab.dot && <span className="tabbar__dot" aria-label="Not bookable yet" />}
          </Link>
        );
      })}
      <span className="tabbar__sp" />
      <Link
        href={bookHref}
        className="btn btn--primary tabbar__book"
        target={book.external ? "_blank" : undefined}
        rel={book.external ? "noopener" : undefined}
      >
        {book.label}
      </Link>
    </div>
  );
}
