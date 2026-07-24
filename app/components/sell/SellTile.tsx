import Link from "next/link";

/** Gradient banner for a live sister-brand or in-house tour line, e.g. "Fishing charters run from Tofino harbour". */
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
