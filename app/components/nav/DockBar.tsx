"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { City, CityCategory } from "@/app/lib/content";
import type { CtaResult } from "@/app/lib/cta";

/**
 * Mobile-only (<900px) bottom-docked Book bar, the mockup's `.m-cta`.
 * `.tabbar__book` (desktop/tablet) is hidden below 900px with nothing
 * rendered in its place, so the Book action disappeared entirely on mobile
 * with no replacement: this fills that gap. Mirrors `TabBarActive`'s
 * pathname-based active-key resolution (duplicated rather than imported, to
 * avoid editing that file) so the dock bar shows the same per-category CTA
 * the tab bar would, just fixed to the viewport bottom instead of inside
 * the sticky bar (`.dockbar` itself is only visible below 900px, see
 * theme.css).
 */
export function DockBar({
  city,
  categories,
  ctas,
}: {
  city: City;
  categories: CityCategory[];
  ctas: Record<string, CtaResult>;
}) {
  const pathname = usePathname();
  const active = resolveActive(pathname, city.slug, categories);
  const cta = (ctas[active] ?? ctas.overview).primary;
  const href = cta.href ?? (cta.kind === "sister-brand" ? "#" : `/${city.slug}#stays`);

  return (
    <div className="dockbar">
      <Link
        href={href}
        className="btn btn--primary"
        target={cta.external ? "_blank" : undefined}
        rel={cta.external ? "noopener" : undefined}
      >
        {cta.label}
      </Link>
    </div>
  );
}

function resolveActive(pathname: string, citySlug: string, categories: CityCategory[]): string {
  const rest = pathname.replace(new RegExp(`^/${citySlug}`), "").replace(/^\/+/, "");
  const [first] = rest.split("/").filter(Boolean);
  if (!first) return "overview";
  if (first === "things-to-do") return "things-to-do";
  if (first === "guides") return "guides";
  if (first === "gallery") return "photos";
  if (categories.some((c) => c.categorySlug === first)) return first;
  return "overview";
}
