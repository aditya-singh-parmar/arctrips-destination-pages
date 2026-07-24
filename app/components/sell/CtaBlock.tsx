import Link from "next/link";
import type { CtaResult } from "@/app/lib/cta";
import { NotifyForm } from "./NotifyForm";

/**
 * Renders exactly one `.btn--primary`, per the brand hard rule of one
 * primary CTA per screen. `cta.primary` is never undefined (Stays is always
 * the fallback), so this never dead-ends.
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
export function CtaBlock({ cta, citySlug }: { cta: CtaResult; citySlug: string }) {
  const { primary, notify } = cta;
  const modifier = primary.kind === "tours" ? "cta--live" : primary.kind === "sister-brand" ? "cta--sister" : "";

  return (
    <div className={modifier ? `cta ${modifier}` : "cta"}>
      <Link
        href={primary.href ?? "#"}
        className="btn btn--primary cta__button"
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
