import Link from "next/link";
import type { CtaResult } from "@/app/lib/cta";
import { NotifyForm } from "./NotifyForm";

/**
 * `cta.primary` is never undefined (Stays is always the fallback), so this
 * never dead-ends.
 *
 * Deliberately does NOT render `.btn--primary`: every page that uses
 * `CtaBlock` lives under `app/[city]/layout.tsx`, whose sticky `TabBar`
 * already renders the page's one `.btn--primary` "Book" button (spec
 * section 6: "the Book button lives in the tab bar"). A second
 * `.btn--primary` here would violate the one-primary-per-screen hard rule,
 * even though the tab bar and this in-content block point at the same
 * booking action. `.btn--outline` keeps this a clear, real link (not a
 * disabled/dead one), just visually secondary to the tab bar's button.
 *
 * Modifier mapping (Task 7 only defines `.cta--live` / `.cta--sister` /
 * `.cta--soon`, so `.cta--soon` is reserved for the nested amber notify
 * capture rather than the primary button, which is never itself
 * coming_soon): `tours` -> `.cta--live`, `sister-brand` -> `.cta--sister`,
 * `stays` -> no modifier (base `.cta`).
 *
 * `citySlug` isn't in the plan's one-prop signature but `notify_signups`
 * needs a real city to follow up against, and `CtaResult` itself doesn't
 * carry it (it's an input to `resolveCta`, not part of the output), added
 * as the minimal necessary extension.
 */
export function CtaBlock({
  cta,
  citySlug,
  cityPath,
}: {
  cta: CtaResult;
  citySlug: string;
  /** Deep-tree path for the city, e.g. /destinations/bc/vancouver-island/tofino. */
  cityPath?: string;
}) {
  const { primary, notify } = cta;
  const modifier = primary.kind === "tours" ? "cta--live" : primary.kind === "sister-brand" ? "cta--sister" : "";
  // Internal CTAs (stays, in-house tours) don't carry an href when the
  // product line has no externalUrl (e.g. the plain "Book dates" stays
  // fallback): land on the city's own "Where to stay" anchor rather than a
  // dead "#" link. Mirrors the same fallback in nav/TabBar.tsx.
  const href = primary.href ?? (primary.kind === "sister-brand" ? "#" : `${cityPath ?? `/${citySlug}`}#stays`);

  return (
    <div className={modifier ? `cta ${modifier}` : "cta"}>
      <Link
        href={href}
        className="btn btn--outline cta__button"
        target={primary.external ? "_blank" : undefined}
        rel={primary.external ? "noopener" : undefined}
      >
        {primary.label}
      </Link>
      {primary.kind === "sister-brand" && <span className="cta__badge">ArcTrips Fishing</span>}

      {notify && (
        <div className="cta cta--soon">
          <p className="cta__offer">{notify.label}</p>
          <NotifyForm productLineSlug={notify.productLineSlug} citySlug={citySlug} />
        </div>
      )}
    </div>
  );
}
