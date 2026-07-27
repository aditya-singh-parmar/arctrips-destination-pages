import Link from "next/link";
import Image from "next/image";
import { cld, placeholder } from "@/app/lib/cloudinary";

export type CategoryCardCategory = { slug: string; name: string; blurb?: string; heroPublicId?: string };

/**
 * Rail card for a "things to do" category. `citySlug` isn't in the plan's
 * literal prop list but is required to build the link
 * (`/{citySlug}/{category.slug}`), added as the obvious minimal extension.
 *
 * `state` grew a fourth value, `"open"`, beyond the plan's literal
 * `"live"|"sister"|"soon"`: real experience inventory is placeholder data
 * (spec section 9), so most Tofino/Ucluelet categories (beaches, surfing,
 * hiking, restaurants, storm-watching) have zero experience rows and no
 * mapped product line at all. Labelling those "live" would fabricate a
 * "0 to book" badge; `"open"` renders no badge and no price, just the
 * category name and its meta line, the category-level analogue of a
 * `PlaceCard` place with `experienceCount === 0` ("Free to visit" rather
 * than a dead button, spec section 5's rule extended one level up).
 * `bookableCount` (renamed from the plan's `placeCount`, which the mockup
 * actually uses as the bookable count shown in the "N to book" badge, not
 * the total place count) is only rendered when `state === "live"`.
 */
export function CategoryCard({
  category,
  citySlug,
  basePath,
  bookableCount,
  state,
  priceFrom,
}: {
  category: CategoryCardCategory;
  citySlug: string;
  /**
   * Deep-tree base, e.g. `/destinations/canada/bc/vancouver-island/tofino/things-to-do`.
   * Optional so any call site not yet migrated keeps its flat link.
   */
  basePath?: string;
  bookableCount: number;
  state: "live" | "sister" | "soon" | "open";
  priceFrom?: number;
}) {
  const href = basePath ? `${basePath}/${category.slug}` : `/${citySlug}/${category.slug}`;
  return (
    <Link href={href} className="pcard" data-state={state}>
      <div className="pcard__media">
        <Image
          src={category.heroPublicId ? cld(category.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)}
          alt={category.name}
          width={380}
          height={260}
          sizes="172px"
        />
        {state === "live" && <span className="pcard__badge">{bookableCount} to book</span>}
        {state === "sister" && <span className="pcard__badge" data-state="sister">ARCTRIPS FISHING</span>}
        {state === "soon" && <span className="pcard__badge" data-state="soon">COMING SOON</span>}
      </div>
      <h4 className="pcard__title">{category.name}</h4>
      {category.blurb && <p className="pcard__meta">{category.blurb}</p>}
      {state === "soon" ? (
        <p className="pcard__price" data-state="soon">Notify me &rarr;</p>
      ) : (
        state !== "open" && priceFrom !== undefined && (
          <p className="pcard__price">
            from ${priceFrom}
          </p>
        )
      )}
    </Link>
  );
}
