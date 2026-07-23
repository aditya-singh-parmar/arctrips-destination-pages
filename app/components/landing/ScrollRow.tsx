"use client";

import { useRef } from "react";
import { IconArrow } from "@/app/components/ui/Icons";

/** Section with a title, prev/next arrows, and a horizontally scrolling track. */
export function ScrollRow({
  title,
  children,
  arrowsLeft = false,
  viewAll,
}: {
  title: string;
  children: React.ReactNode;
  /** When true (destination-name rails), arrows sit right after the title on the left. */
  arrowsLeft?: boolean;
  /** Centered outline button below the track, e.g. "View all listings in Tofino". */
  viewAll?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  };
  const arrows = (
    <div className="rowhead__arrows">
      <button className="arrow" aria-label="Previous" onClick={() => scroll(-1)}>
        <IconArrow width={20} height={20} style={{ transform: "rotate(180deg)" }} />
      </button>
      <button className="arrow arrow--filled" aria-label="Next" onClick={() => scroll(1)}>
        <IconArrow width={20} height={20} />
      </button>
    </div>
  );

  return (
    <section className="container section">
      <div className="rowhead">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 className="t-h2">{title}</h2>
          {arrowsLeft && arrows}
        </div>
        {!arrowsLeft && arrows}
      </div>
      <div className="scroller" ref={ref}>{children}</div>
      {viewAll ? (
        <div className="viewall">
          <button className="btn btn--outline" type="button">{viewAll}</button>
        </div>
      ) : null}
    </section>
  );
}
