import Link from "next/link";
import type { CtaResult } from "@/app/lib/cta";
import type { Experience } from "@/app/lib/content";
import { NotifyForm } from "@/app/components/sell/NotifyForm";

/**
 * The booking path, as a centred panel in the page's own language rather than
 * a sticky sidebar. The sidebar and the in-page index that sat beside it were
 * built and rejected: on a reading surface they compete with the photography
 * and push the column off centre.
 *
 * This renders exactly what `resolveCta` returned and never a hardcoded
 * button, so launching whale watching tours stays a status change on one
 * product_lines row. A coming-soon category captures an email and still falls
 * through to stays, so no guide dead-ends.
 */
export function CtaPanel({
  cta,
  experiences,
  citySlug,
  cityName,
  stayHref,
  stayCount,
  stayFrom,
}: {
  cta: CtaResult;
  experiences: Experience[];
  citySlug: string;
  cityName: string;
  /** Where the stays fallback points, normally the town page's stays anchor. */
  stayHref: string;
  stayCount?: number;
  stayFrom?: number;
}) {
  const { primary, notify } = cta;
  const href = primary.href ?? (primary.kind === "stays" ? stayHref : stayHref);
  const bookable = primary.kind === "stays" ? [] : experiences;

  const sub =
    bookable.length > 0
      ? `${bookable.length} option${bookable.length === 1 ? "" : "s"} in ${cityName}${
          priceFrom(bookable) !== undefined ? `, from $${priceFrom(bookable)}` : ""
        }.`
      : stayCount
        ? `${stayCount} cabins, cottages and lodges in ${cityName}${stayFrom ? `, from $${stayFrom} a night` : ""}.`
        : `Free to visit in ${cityName}.`;

  return (
    <div className="panel panel--azure center">
      <span className="eyebrow">{notify ? "Not open yet" : "To book"}</span>
      <h2>{primary.label}.</h2>
      <p className="sub">{sub}</p>

      <p style={{ marginTop: 20 }}>
        <Link
          className="btn btn--primary"
          href={href}
          target={primary.external ? "_blank" : undefined}
          rel={primary.external ? "noopener" : undefined}
        >
          {primary.label}
        </Link>
      </p>

      {notify && (
        <div style={{ marginTop: 22 }}>
          <p className="cta__offer">{notify.label}</p>
          <NotifyForm productLineSlug={notify.productLineSlug} citySlug={citySlug} />
        </div>
      )}
    </div>
  );
}

function priceFrom(experiences: Experience[]): number | undefined {
  const prices = experiences.map((e) => e.priceFrom).filter((n): n is number => n !== undefined);
  return prices.length ? Math.min(...prices) : undefined;
}
