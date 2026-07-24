"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { IconArrow } from "@/app/components/ui/Icons";

/**
 * Horizontal card rail: a `.sh`-equivalent header (title, optional subtitle,
 * optional "See all" link) plus a scroll-snapping track. The circular arrow
 * scrolls by one track-width so it always lands on a card boundary.
 */
export function Rail({
  title,
  href,
  subtitle,
  children,
}: {
  title: string;
  href?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByOne() {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: track.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <div className="railwrap">
      <div className="rail__head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="rail__seeall">
            See all &rarr;
          </Link>
        )}
      </div>
      <div className="rail">
        <div className="rail__track" ref={trackRef}>
          {children}
        </div>
        <button type="button" className="arrow rail__arrow" onClick={scrollByOne} aria-label="Scroll right">
          <IconArrow />
        </button>
      </div>
    </div>
  );
}
