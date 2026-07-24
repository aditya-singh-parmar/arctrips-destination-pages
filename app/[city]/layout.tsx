import { notFound } from "next/navigation";
import { getCity, getCityCategories, getExperiences } from "@/app/lib/content";
import { resolveCta, type CtaResult } from "@/app/lib/cta";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { DestinationSearch } from "@/app/components/nav/DestinationSearch";
import { TabBarActive } from "@/app/components/nav/TabBarActive";
import { DockBar } from "@/app/components/nav/DockBar";

/**
 * Shared shell for every page under `/[city]`: top nav, destination search,
 * sticky tab bar, page content, footer. Task 9. Kept out of this layout:
 * the breadcrumb, because its depth varies by page (city / category / place)
 * and a layout can only see its own `params` (`{ city }`), not a child
 * route's deeper segments. Each page renders its own `<Breadcrumb>` with the
 * trail depth it actually has, right above its content.
 */
export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city) notFound();

  const categories = await getCityCategories(citySlug);

  const cityExperiences = await getExperiences(citySlug);
  const ctas: Record<string, CtaResult> = {
    overview: resolveCta({ citySlug, cityName: city.name, categorySlug: "__overview__", experiences: cityExperiences }),
  };
  await Promise.all(
    categories.map(async (c) => {
      const experiences = await getExperiences(citySlug, { categorySlug: c.categorySlug });
      ctas[c.categorySlug] = resolveCta({ citySlug, cityName: city.name, categorySlug: c.categorySlug, experiences });
    }),
  );

  return (
    <>
      <TopNav active="destinations" />
      <div className="container" style={{ paddingTop: 12, paddingBottom: 8 }}>
        <DestinationSearch />
      </div>
      {/* Full-bleed like `.nav`: `.tabbar` carries its own `padding-inline: var(--gutter)`
          so its sticky background spans the viewport edge to edge, matching TopNav's
          `.nav` (full width) / `.nav__inner` (constrained) split rather than nesting it
          inside `.container`, which would double the horizontal padding. */}
      <TabBarActive city={city} categories={categories} ctas={ctas} />
      <div className="container has-dockbar">{children}</div>
      <Footer />
      <DockBar city={city} categories={categories} ctas={ctas} />
    </>
  );
}
