import Link from "next/link";
import Image from "next/image";
import { cld, placeholder } from "@/app/lib/cloudinary";

export type CategoryCardCategory = { slug: string; name: string; blurb?: string; heroPublicId?: string };

/**
 * Rail card for a "things to do" category, one of three booking states.
 * `citySlug` isn't in the plan's literal prop list but is required to build
 * the link (`/{citySlug}/{category.slug}`), added as the obvious minimal
 * extension, documented here per the brief.
 */
export function CategoryCard({
  category,
  citySlug,
  placeCount,
  state,
  priceFrom,
}: {
  category: CategoryCardCategory;
  citySlug: string;
  placeCount: number;
  state: "live" | "sister" | "soon";
  priceFrom?: number;
}) {
  return (
    <Link href={`/${citySlug}/${category.slug}`} className="pcard" data-state={state}>
      <div className="pcard__media">
        <Image
          src={category.heroPublicId ? cld(category.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)}
          alt={category.name}
          width={380}
          height={260}
          sizes="172px"
        />
        {state === "live" && <span className="pcard__badge">{placeCount} to book</span>}
        {state === "sister" && <span className="pcard__badge" data-state="sister">ARCTRIPS FISHING</span>}
        {state === "soon" && <span className="pcard__badge" data-state="soon">COMING SOON</span>}
      </div>
      <h4 className="pcard__title">{category.name}</h4>
      {category.blurb && <p className="pcard__meta">{category.blurb}</p>}
      {state === "soon" ? (
        <p className="pcard__price" data-state="soon">Notify me &rarr;</p>
      ) : (
        priceFrom !== undefined && (
          <p className="pcard__price">
            from ${priceFrom}
          </p>
        )
      )}
    </Link>
  );
}
