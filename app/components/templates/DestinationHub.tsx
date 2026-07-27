import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCity,
  getGuidesForCity,
  getPlanningPieces,
  getListings,
} from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { breadcrumbList, itemList, touristDestination } from "@/app/lib/jsonld";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { CategoryCard } from "@/app/components/browse/CategoryCard";
import { Rail } from "@/app/components/browse/Rail";
import { ListingCard } from "@/app/components/landing/ListingCard";
import { SellTile } from "@/app/components/sell/SellTile";

const SITE = "https://arctrips.com";

/**
 * The destination hub, moved onto the deep tree from the S1 flat route
 * (owner-approved 2026-07-24): ONE FLAT grid of guides, then a short planning
 * row, then stays. Rendering is unchanged; only the breadcrumb trail and the
 * internal hrefs now come from the geographic trail.
 */
export async function DestinationHub({ citySlug, trail }: { citySlug: string; trail: GeoNode[] }) {
  const city = await getCity(citySlug);
  if (!city) notFound();

  const [guides, planning, listings] = await Promise.all([
    getGuidesForCity(citySlug),
    getPlanningPieces(citySlug),
    getListings({ destinationSlug: citySlug }),
  ]);

  const base = geoPath(trail);

  // The destination page had no booking surface at all: you could only buy
  // once you were inside a guide. This is the page's one primary CTA, and it
  // falls back to stays so it can never render empty, the same no-dead-end
  // rule the guide CTA resolver follows.
  const bookable = guides.filter((g) => g.state === "live" || g.state === "sister");
  const stayFrom = listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined;
  const sellBlurb = bookable.length
    ? bookable.map((g) => `${g.name}${g.priceFrom ? ` from $${g.priceFrom}` : ""}`).join(", ")
    : `Cabins, cottages and lodges${stayFrom ? `, from $${stayFrom} a night` : ""}.`;
  const sellHeadline = bookable.length
    ? `${bookable.length} thing${bookable.length === 1 ? "" : "s"} you can book in ${city.name} today`
    : `${city.listingCount} places to stay in ${city.name}`;

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={breadcrumbList([
        { name: "Destinations", url: `${SITE}/destinations` },
        ...trail.map((n, i) => ({ name: n.name, url: `${SITE}${geoPath(trail.slice(0, i + 1))}` })),
      ])} />
      <JsonLd data={touristDestination(
        { name: city.name, lat: trail[trail.length - 1]?.lat, lng: trail[trail.length - 1]?.lng },
        `${SITE}${base}`,
        city.standfirst,
      )} />
      <JsonLd data={itemList(
        guides.map((g) => ({ name: g.name, url: `${SITE}${base}/things-to-do/${g.categorySlug}` })),
        `Things to do in ${city.name}`,
      )} />
      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            ...trail.slice(0, -1).map((node, i) => ({
              href: geoPath(trail.slice(0, i + 1)),
              label: node.name,
            })),
            { label: city.name },
          ]}
        />

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

        <SellTile headline={sellHeadline} blurb={sellBlurb} ctaLabel="Book dates" href={`${base}#stays`} />

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
              basePath={`${base}/things-to-do`}
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
                <Link className="pcard" key={a.slug} href={`/guides/${a.slug}`}>
                  <div className="pcard__media">
                    <Image src={a.heroPublicId ? cld(a.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)} alt={a.title} width={380} height={260} sizes="172px" />
                  </div>
                  <h4 className="pcard__title">{a.title}</h4>
                  {a.excerpt && <p className="pcard__meta">{a.excerpt}</p>}
                </Link>
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
