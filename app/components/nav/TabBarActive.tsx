"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";
import type { City, CityCategory } from "@/app/lib/content";
import type { CtaResult } from "@/app/lib/cta";

/**
 * `TabBar` itself has no server-only dependency (no cookies/headers/DB
 * calls, just Links and pure taxonomy lookups), so it can be rendered from
 * this Client Component without a "use client" of its own. This wrapper
 * exists only so `app/[city]/layout.tsx` can render one shared tab bar for
 * every page under a city (spec section 6: "same position on every page")
 * without each page having to know and pass its own `active` key up into
 * a layout, which the App Router has no built-in channel for. Reading the
 * current path client-side is the least invasive way to do that.
 */
export function TabBarActive({
  city,
  categories,
  ctas,
}: {
  city: City;
  categories: CityCategory[];
  /**
   * One resolved CTA per tab key, e.g. `{ overview: <stays "Book dates">,
   * beaches: <stays "Book a stay for beaches season">, fishing: <sister-brand> }`.
   * The book button changes per section on the real mockup (city page reads
   * "Book dates", the beaches category page reads "Book a beach day"), so a
   * single constant CTA on the shared layout would be wrong; the layout
   * resolves one per category up front and this component just picks the
   * one matching the current path.
   */
  ctas: Record<string, CtaResult>;
}) {
  const pathname = usePathname();
  const active = resolveActive(pathname, city.slug, categories);
  const cta = ctas[active] ?? ctas.overview;
  return <TabBar city={city} categories={categories} active={active} cta={cta} />;
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
