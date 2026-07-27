import Link from "next/link";

/**
 * Flat navy band for a live sister-brand or in-house tour line, e.g. "Fishing
 * charters run from Tofino harbour". The gradient it used to carry is gone
 * from `theme.css`.
 *
 * No longer used by the destination hub: a blue band interrupting the spread
 * was one of the things that made the tree read as a marketplace, and the
 * hub's booking path now lives in its orientation rail. Kept for a surface
 * that genuinely needs a sister-brand hand-off band.
 */
export function SellTile({
  headline,
  blurb,
  ctaLabel,
  href,
  external,
}: {
  headline: string;
  blurb: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
}) {
  return (
    <div className="selltile">
      <div>
        <b className="selltile__headline">{headline}</b>
        <span className="selltile__blurb">{blurb}</span>
      </div>
      <Link
        href={href}
        className="selltile__go"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener" : undefined}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
