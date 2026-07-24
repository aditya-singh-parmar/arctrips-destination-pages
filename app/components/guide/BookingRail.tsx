import Link from "next/link";
import Image from "next/image";
import type { CtaResult } from "@/app/lib/cta";
import type { Experience, Listing } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { NotifyForm } from "@/app/components/sell/NotifyForm";

/**
 * The guide article's persistent booking rail (spec: "beside the article
 * body on desktop, stacking below on mobile", `.guidelayout`/`.guiderail` in
 * theme.css). This renders exactly what `resolveCta` returns, never a
 * hardcoded button: `cta.primary` becomes the page's one `.btn--primary`
 * (there is no tab bar here to own that slot, unlike the deleted v1.1 tree
 * pages), and `cta.notify` renders the existing `NotifyForm` server action
 * when the mapped product line is coming soon.
 */
export function BookingRail({
  cta,
  experiences,
  citySlug,
  cityName,
  stayCount,
  stayFrom,
  listings = [],
}: {
  cta: CtaResult;
  experiences: Experience[];
  citySlug: string;
  cityName: string;
  stayCount?: number;
  stayFrom?: number;
  /** Real Arc Trips stays, shown when the CTA falls back to stays so the rail
   *  offers something concrete instead of a bare button. */
  listings?: Listing[];
}) {
  const { primary, notify } = cta;
  const href = primary.href ?? (primary.kind === "sister-brand" ? "#" : `/${citySlug}#stays`);
  // Keep the rows honest against the button: when the resolver falls back to
  // stays, the rail lists real Arc Trips stays with real nightly prices,
  // rather than placeholder tour rows for a line that is not live yet.
  const showStays = primary.kind === "stays";
  const stays = showStays ? listings.slice(0, 3) : [];
  const tours = showStays ? [] : experiences;

  return (
    <aside className="guiderail">
      <div className="buy">
        <div className="buy__head">
          <h4>{primary.label}</h4>
          <p>
            {tours.length > 0
              ? `${tours.length} option${tours.length === 1 ? "" : "s"} in ${cityName}`
              : stays.length > 0
                ? `${stayCount ?? stays.length} stays in ${cityName}${stayFrom ? `, from $${stayFrom} a night` : ""}`
                : `Free to visit in ${cityName}`}
          </p>
        </div>

        {tours.map((e) => (
          <div className="opt" key={e.id}>
            {e.heroPublicId && (
              <Image src={cld(e.heroPublicId, { w: 150, fit: "limit" })} alt="" width={52} height={42} />
            )}
            <div>
              <b>{e.title}</b>
              {e.duration && <span>{e.duration}</span>}
            </div>
            {e.priceFrom !== undefined && <span className="pr">${e.priceFrom}</span>}
          </div>
        ))}

        {stays.map((l) => (
          <Link className="opt" key={l.id} href={`/${citySlug}#stays`}>
            <Image src={cld(l.heroPublicId, { w: 150, fit: "limit" })} alt="" width={52} height={42} />
            <div>
              <b>{l.title}</b>
              <span>{l.beds} beds, {l.baths} baths</span>
            </div>
            <span className="pr">${l.pricePerNight}</span>
          </Link>
        ))}

        <div className="buy__foot">
          <Link
            href={href}
            className="btn btn--primary"
            target={primary.external ? "_blank" : undefined}
            rel={primary.external ? "noopener" : undefined}
          >
            {primary.label}
          </Link>
          <p className="buy__fine">
            {primary.kind === "stays"
              ? "See real-time availability and pricing."
              : "Free cancellation up to 48 hours."}
          </p>
        </div>
      </div>

      {notify && (
        <div className="cta cta--soon" style={{ marginTop: 16 }}>
          <p className="cta__offer">{notify.label}</p>
          <NotifyForm productLineSlug={notify.productLineSlug} citySlug={citySlug} />
        </div>
      )}

      {stayCount !== undefined && stayCount > 0 && (
        <div className="softnote" style={{ marginTop: 16 }}>
          <b>Stay after?</b> {stayCount} places in {cityName}
          {stayFrom !== undefined ? `, from $${stayFrom}` : ""}.
        </div>
      )}
    </aside>
  );
}
