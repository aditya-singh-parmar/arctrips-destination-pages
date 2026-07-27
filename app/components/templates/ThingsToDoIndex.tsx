import { notFound } from "next/navigation";
import { getCity, getGuidesForCity } from "@/app/lib/content";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { breadcrumbList, itemList } from "@/app/lib/jsonld";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { CategoryCard } from "@/app/components/browse/CategoryCard";
import { JsonLd } from "@/app/components/ui/JsonLd";

const SITE = "https://arctrips.com";

/**
 * The full category set for a town, so the destination hub can cap its own
 * grid without hiding anything and the whole set is crawlable in one hop.
 *
 * A town with no categories 404s rather than rendering an empty grid. That is
 * every Agent Trek city, which imports whole and has no category rows at all
 * (spec assumption A6, AC 5 and AC 18).
 */
export async function ThingsToDoIndex({ town, trail }: { town: GeoNode; trail: GeoNode[] }) {
  const [city, guides] = await Promise.all([getCity(town.slug), getGuidesForCity(town.slug)]);
  if (!city || guides.length === 0) notFound();

  const base = geoPath(trail);
  const todo = `${base}/things-to-do`;

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={breadcrumbList([
        { name: "Destinations", url: `${SITE}/destinations` },
        ...trail.map((n, i) => ({ name: n.name, url: `${SITE}${geoPath(trail.slice(0, i + 1))}` })),
        { name: "Things to do" },
      ])} />
      <JsonLd data={itemList(
        guides.map((g) => ({ name: g.name, url: `${SITE}${todo}/${g.categorySlug}` })),
        `Things to do in ${city.name}`,
      )} />

      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            ...trail.slice(0, -1).map((n, i) => ({ href: geoPath(trail.slice(0, i + 1)), label: n.name })),
            { href: base, label: city.name },
            { label: "Things to do" },
          ]}
        />

        <div className="section" style={{ paddingBottom: 8 }}>
          <div className="rowhead">
            <div>
              <h1 className="t-h1">Things to do in {city.name}</h1>
              <p className="t-reg-14" style={{ marginTop: 6 }}>
                {guides.length} guide{guides.length === 1 ? "" : "s"}. Each one is an article, and where there is a
                trip to book it is inside that article.
              </p>
            </div>
          </div>
        </div>

        <div className="pcardgrid">
          {guides.map((g) => (
            <CategoryCard
              key={g.categorySlug}
              category={{
                slug: g.categorySlug,
                name: g.name,
                blurb: g.placeCount ? `${g.placeCount} places` : undefined,
                heroPublicId: g.heroPublicId,
              }}
              citySlug={town.slug}
              basePath={todo}
              bookableCount={g.bookableCount}
              state={g.state}
              priceFrom={g.priceFrom}
            />
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
