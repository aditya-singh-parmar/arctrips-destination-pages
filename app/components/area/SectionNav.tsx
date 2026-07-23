"use client";

import { useEffect, useState } from "react";
import type { AreaSection } from "@/app/lib/content";

/** Sticky jump-menu (sidebar on desktop, horizontal bar on mobile) with scrollspy. */
export function SectionNav({ sections }: { sections: AreaSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  const links = sections.map((s) => (
    <li key={s.id}>
      <a href={`#${s.id}`} data-active={active === s.id} onClick={(e) => onClick(e, s.id)}>{s.label}</a>
    </li>
  ));

  return (
    <>
      <nav className="area-nav" aria-label="Sections"><ul>{links}</ul></nav>
      <nav className="area-nav--bar" aria-label="Sections"><ul>{links}</ul></nav>
    </>
  );
}
