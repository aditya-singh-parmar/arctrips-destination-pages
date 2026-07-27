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
import { getDestinationCategories, getGeoChildren, getGeoChildLinks, pathForTownSlug } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS, seasonalRank } from "@/app/lib/taxonomy";
import { seasonLabel } from "@/app/components/browse/BestTime";
import { TRAVELLER_PROFILES } from "@/app/components/templates/PlanIndex";
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

  const node = trail[trail.length - 1];
  const parent = trail[trail.length - 2];

  const [guides, planning, listings, cats, areas, siblings] = await Promise.all([
    getGuidesForCity(citySlug),
    getPlanningPieces(citySlug),
    getListings({ destinationSlug: citySlug }),
    getDestinationCategories(node.id),
    getGeoChildren(node.id, "area"),
    parent ? getGeoChildren(parent.id, "town") : Promise.resolve([]),
  ]);

  const base = geoPath(trail);

  // Seasonal ordering (AC 48): what is in season now leads the grid. Storm
  // watching rises in December and falls back in April, without an editor
  // touching sort_order.
  const month = new Date().getMonth() + 1;
  const monthsFor = (slug: string) =>
    cats.find((c) => c.categorySlug === slug)?.bestMonths?.length
      ? cats.find((c) => c.categorySlug === slug)!.bestMonths
      : CATEGORY_BEST_MONTHS[slug] ?? [];
  const ordered = [...guides].sort(
    (a, b) => seasonalRank(monthsFor(a.categorySlug), month) - seasonalRank(monthsFor(b.categorySlug), month),
  );

  // Nearby destinations: the other towns under this town's parent, capped at
  // six and reciprocal by construction (AC 52).
  const nearby = await Promise.all(
    siblings
      .filter((t) => t.slug !== citySlug)
      .slice(0, 6)
      .map(async (t) => ({ node: t, path: await pathForTownSlug(t.slug) })),
  );

  const facts = node.facts;

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

        {facts.length > 0 && (
          <dl className="keyfacts">
            {facts.map((f) => (
              <div className="keyfacts__i" key={f.k}>
                <dt className="keyfacts__k">{f.k}</dt>
                <dd className="keyfacts__v">{f.v}</dd>
              </div>
            ))}
            <div className="keyfacts__i">
              <dt className="keyfacts__k">Currency</dt>
              <dd className="keyfacts__v">{node.currency ?? trail[0]?.currency ?? "CAD"}</dd>
            </div>
          </dl>
        )}

        <SellTile headline={sellHeadline} blurb={sellBlurb} ctaLabel="Book dates" href={`${base}#stays`} />

        <div className="rail__head" style={{ marginTop: 24 }}>
          <div>
            <h2>Things to do in {city.name}</h2>
            <p>{guides.length} guide{guides.length === 1 ? "" : "s"}. Each one is an article, and where there is a trip to book it is inside that article.</p>
          </div>
        </div>
        <div className="pcardgrid">
          {ordered.map((g) => (
            <CategoryCard
              key={g.categorySlug}
              category={{
                slug: g.categorySlug,
                name: g.name,
                blurb: g.placeCount ? `${g.placeCount} places` : undefined,
                heroPublicId: g.heroPublicId,
                season: seasonLabel(monthsFor(g.categorySlug)),
              }}
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
              <Link className="viewall" href={`${base}/plan`}>All planning</Link>
            </div>
            <div className="profiles">
              {TRAVELLER_PROFILES.map((pr) => (
                <Link key={pr.slug} href={`${base}/plan?for=${pr.slug}`}>{pr.name}</Link>
              ))}
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

        {areas.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="rail__head">
              <div>
                <h2>Areas in {city.name}</h2>
                <p>The specific places people mean when they name this town.</p>
              </div>
            </div>
            <div className="nearby">
              {areas.map((a) => (
                <Link className="nearby__i" key={a.id} href={`${base}/${a.slug}`}>
                  <Image
                    src={a.heroPublicId ? cld(a.heroPublicId, { w: 96, h: 96, fit: "fill" }) : placeholder(48, 48)}
                    alt=""
                    width={40}
                    height={40}
                  />
                  {a.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {nearby.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="rail__head">
              <div>
                <h2>Nearby</h2>
                <p>Close enough to combine into one trip.</p>
              </div>
            </div>
            <div className="nearby">
              {nearby.map(({ node: t, path }) => (
                <Link className="nearby__i" key={t.id} href={path}>
                  <Image
                    src={t.heroPublicId ? cld(t.heroPublicId, { w: 96, h: 96, fit: "fill" }) : placeholder(48, 48)}
                    alt=""
                    width={40}
                    height={40}
                  />
                  {t.name}
                  <span className="nearby__d">{t.standfirst ? "guide" : "nearby"}</span>
                </Link>
              ))}
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
