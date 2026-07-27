import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";

/**
 * Three places to stay, labelled by price band.
 *
 * The inventory is identical on every axis that a marketplace would normally
 * rank on: same bed count, same bath count, and 4.9 across the board. Calling
 * one of them "highest rated" would therefore be a lie. Price is the one thing
 * that genuinely differs between them, so price is what the label says, and
 * the three are picked from opposite ends of the range plus the middle so the
 * reader sees the actual spread rather than three near-identical rows.
 *
 * Duplicate titles are dropped, and so is any row whose location contradicts
 * the town, which is what stops a Canmore cabin appearing under Tofino.
 */
const BANDS = ["Lowest rate", "Mid range", "Top of the range"];

export function curateStays(listings: Listing[], cityName: string): Listing[] {
  const town = cityName.toLowerCase();
  const seen = new Set<string>();
  const clean = listings
    .filter((l) => {
      const placed = !l.location || l.location.toLowerCase().includes(town);
      if (!placed || seen.has(l.title)) return false;
      seen.add(l.title);
      return true;
    })
    .sort((a, b) => a.pricePerNight - b.pricePerNight);

  if (clean.length <= 3) return clean;
  return [clean[0], clean[Math.floor(clean.length / 2)], clean[clean.length - 1]];
}

export function StayPicks({
  listings,
  cityName,
  stayCount,
  seeAllHref,
  heading,
}: {
  listings: Listing[];
  cityName: string;
  /** Everything in the town, for the honest "see all" count. */
  stayCount: number;
  seeAllHref: string;
  heading?: string;
}) {
  const three = curateStays(listings, cityName);
  if (three.length === 0) return null;

  const bands = three.length === 3 ? BANDS : three.map(() => "");
  const low = three[0].pricePerNight;
  const high = three[three.length - 1].pricePerNight;
  const spread = three.length > 1 ? `$${low} to $${high} a night` : `$${low} a night`;

  return (
    <>
      <div className="sechead center">
        <span className="eyebrow">Where to stay</span>
        <h2>{heading ?? `Three places to stay in ${cityName}.`}</h2>
        <p className="sub">
          One from each end of the range and one in the middle, {spread}, picked from {stayCount} stays.
        </p>
      </div>
      <div className="stays">
        {three.map((l, i) => (
          <Link className="stay" key={l.id} href={seeAllHref}>
            <div className="stay__m">
              <Image
                src={cld(l.heroPublicId, { w: 620, h: 465, fit: "fill" })}
                alt={l.title}
                width={620}
                height={465}
                sizes="(max-width: 900px) 100vw, 360px"
              />
              {bands[i] && <span className="stay__why">{bands[i]}</span>}
            </div>
            <div className="stay__b">
              <h3>{l.title}</h3>
              <p className="stay__loc">{l.location || cityName}</p>
              <p className="stay__spec">
                {l.beds} beds  ·  {l.baths} baths  ·  {l.rooms} rooms
              </p>
              <div className="stay__foot">
                <span className="stay__price"><b>${l.pricePerNight}</b> a night</span>
                {l.rating > 0 && <span className="stay__rate">{l.rating.toFixed(1)}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="stays__note">
        From-rates before taxes and fees.{" "}
        <Link href={seeAllHref}>See all {stayCount} stays in {cityName}</Link>.
      </p>
    </>
  );
}
