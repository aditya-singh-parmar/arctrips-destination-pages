import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";
import type { Listing } from "@/app/lib/content";
import { IconLocation, IconBed, IconRooms, IconBath, IconStar, IconHeart } from "@/app/components/ui/Icons";

/** `holiday` variant shows the "Guest favorite" pill and hides the location row (matches Figma). */
export function ListingCard({ listing, variant = "default" }: { listing: Listing; variant?: "default" | "holiday" }) {
  const holiday = variant === "holiday";
  return (
    <article className={holiday ? "card card--holiday" : "card"}>
      <div className="card__media">
        <Image
          src={cld(listing.heroPublicId, { w: 832, h: 500, fit: "fill" })}
          alt={listing.title}
          width={832}
          height={500}
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        {holiday && listing.guestFavorite ? (
          <span className="card__fav t-med-14">Guest favorite</span>
        ) : (
          <span className="card__heart" aria-hidden="true"><IconHeart width={24} height={24} /></span>
        )}
      </div>
      <div className="card__body">
        {!holiday && (
          <div className="card__loc">
            <IconLocation />
            <span className="t-reg-14">{listing.location}</span>
          </div>
        )}
        <h3 className="card__title t-med-16">{listing.title}</h3>
        <div className="card__specs t-med-14">
          <span className="card__spec"><IconRooms /> {listing.rooms} room(s)</span>
          <span className="card__spec"><IconBed /> {listing.beds} bed(s)</span>
          <span className="card__spec"><IconBath /> {listing.baths} bath(s)</span>
        </div>
        <div className="card__foot">
          <span className="rating t-med-14"><IconStar width={14} height={14} /> {listing.rating}</span>
          {!holiday && (
            <div>
              <p className="card__price t-black-16">${listing.pricePerNight} {listing.currency}</p>
              <p className="card__note t-reg-12">per night including all taxes &amp; fees</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
