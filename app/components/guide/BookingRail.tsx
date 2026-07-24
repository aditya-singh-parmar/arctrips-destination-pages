import Link from "next/link";
import Image from "next/image";
import type { CtaResult } from "@/app/lib/cta";
import type { Experience } from "@/app/lib/content";
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
}: {
  cta: CtaResult;
  experiences: Experience[];
  citySlug: string;
  cityName: string;
  stayCount?: number;
  stayFrom?: number;
}) {
  const { primary, notify } = cta;
  const href = primary.href ?? (primary.kind === "sister-brand" ? "#" : `/${citySlug}#stays`);

  return (
    <aside className="guiderail">
      <div className="buy">
        <div className="buy__head">
          <h4>{primary.label}</h4>
          <p>
            {experiences.length > 0
              ? `${experiences.length} option${experiences.length === 1 ? "" : "s"} in ${cityName}`
              : `Free to visit in ${cityName}`}
          </p>
        </div>

        {experiences.map((e) => (
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
