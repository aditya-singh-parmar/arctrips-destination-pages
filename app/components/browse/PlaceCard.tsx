import Link from "next/link";
import Image from "next/image";
import type { Place } from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";

/**
 * A place is always routable and always bookable-or-free, never a dead
 * button: `experienceCount > 0` gets the "N to book" badge and a price,
 * `0` gets plain "Free to visit" text (e.g. Tonquin Beach in the mockup).
 */
export function PlaceCard({
  place,
  experienceCount,
  priceFrom,
}: {
  place: Place;
  experienceCount: number;
  priceFrom?: number;
}) {
  const bookable = experienceCount > 0;
  return (
    <Link href={`/${place.citySlug}/${place.categorySlug}/${place.slug}`} className="pcard" data-state={bookable ? "live" : "free"}>
      <div className="pcard__media">
        <Image
          src={place.heroPublicId ? cld(place.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)}
          alt={place.name}
          width={380}
          height={260}
          sizes="172px"
        />
        {bookable && <span className="pcard__badge">{experienceCount} to book</span>}
      </div>
      <h4 className="pcard__title">{place.name}</h4>
      <p className="pcard__meta">{place.blurb}</p>
      {bookable ? (
        priceFrom !== undefined && (
          <p className="pcard__price">
            from ${priceFrom} <span>per person</span>
          </p>
        )
      ) : (
        <p className="pcard__free">Free to visit</p>
      )}
    </Link>
  );
}
