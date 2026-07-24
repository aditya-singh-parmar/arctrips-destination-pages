import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getCity,
  getGuidesForCity,
  getPlanningPieces,
  getListings,
  getDestinations,
  getCityCategories,
} from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { CategoryCard } from "@/app/components/browse/CategoryCard";
import { Rail } from "@/app/components/browse/Rail";
import { ListingCard } from "@/app/components/landing/ListingCard";

export async function generateStaticParams() {
  const destinations = await getDestinations();
  const checked = await Promise.all(
    destinations.map(async (d) => ((await getCityCategories(d.slug)).length > 0 ? d.slug : null)),
  );
  return checked.filter((s): s is string => Boolean(s)).map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  return city ? { title: `${city.name} | Arc Trips`, description: city.standfirst } : { title: "Arc Trips" };
}

/**
 * S1 destination page (owner-approved 2026-07-24): ONE FLAT grid of guides,
 * then a short planning row, then stays. No region tier, no category-index
 * split, no grouping inside the grid. See design/structure/s1/tofino.html.
 */
export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city) notFound();

  const [guides, planning, listings] = await Promise.all([
    getGuidesForCity(citySlug),
    getPlanningPieces(citySlug),
    getListings({ destinationSlug: citySlug }),
  ]);

  return (
    <>
      <TopNav active="destinations" />
      <div className="container">
        <Breadcrumb trail={[{ href: "/destinations", label: "Destinations" }, { label: city.name }]} />

        <div className="chero">
          <div className="chero__media">
            <Image src={cld(city.heroPublicId, { w: 1600, fit: "limit" })} alt={city.name} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
          <div className="chero__scrim" aria-hidden="true" />
          <div className="chero__text">
            <h1 className="t-h1">{city.name}</h1>
            <p className="chero__sub">{city.standfirst}</p>
          </div>
          <span className="chero__summary">{city.listingCount} stays</span>
        </div>

        <p className="cityintro">{city.overview[0]}</p>
        {city.overview.slice(1).map((p, i) => <p className="cityintro" key={i}>{p}</p>)}

        <div className="rail__head" style={{ marginTop: 24 }}>
          <div>
            <h2>Things to do in {city.name}</h2>
            <p>{guides.length} guide{guides.length === 1 ? "" : "s"}. Each one is an article, and where there is a trip to book it is inside that article.</p>
          </div>
        </div>
        <div className="pcardgrid">
          {guides.map((g) => (
            <CategoryCard
              key={g.categorySlug}
              category={{ slug: g.categorySlug, name: g.name, blurb: g.placeCount ? `${g.placeCount} places` : undefined, heroPublicId: g.heroPublicId }}
              citySlug={citySlug}
              bookableCount={g.bookableCount}
              state={g.state}
              priceFrom={g.priceFrom}
            />
          ))}
        </div>

        {planning.length > 0 && (
          <div id="planning" style={{ scrollMarginTop: 96 }}>
            <div className="rail__head" style={{ marginTop: 32 }}>
              <div>
                <h2>Planning your trip</h2>
                <p>Not things to do, but the questions that decide the trip.</p>
              </div>
            </div>
            <div className="pcardgrid">
              {planning.map((a) => (
                <div className="pcard" key={a.slug}>
                  <div className="pcard__media">
                    <Image src={a.heroPublicId ? cld(a.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)} alt={a.title} width={380} height={260} sizes="172px" />
                  </div>
                  <h4 className="pcard__title">{a.title}</h4>
                  {a.excerpt && <p className="pcard__meta">{a.excerpt}</p>}
                </div>
              ))}
            </div>
            <div className="softnote" style={{ marginTop: 18 }}>
              Planning pieces sit in their own row here rather than inside the things-to-do grid above, so the
              selling row is not diluted by articles nobody can book.
            </div>
          </div>
        )}

        {listings.length > 0 && (
          <div id="stays" style={{ scrollMarginTop: 96 }}>
            <Rail title={`Where to stay in ${city.name}`} subtitle={`${listings.length} cabins, cottages and lodges`}>
              {listings.slice(0, 8).map((l) => (
                <ListingCard key={l.id} listing={l} variant="holiday" />
              ))}
            </Rail>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
