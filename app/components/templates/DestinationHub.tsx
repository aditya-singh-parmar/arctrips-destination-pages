import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCity,
  getCityCategories,
  getPhotos,
  getGuidesForCity,
  getListings,
  getPlanningPieces,
} from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { GuideBody } from "@/app/components/guide/GuideBody";
import { BodyContents } from "@/app/components/browse/BodyContents";
import { cleanText } from "@/app/components/browse/text";
import { breadcrumbList, itemList, touristDestination } from "@/app/lib/jsonld";
import { getDestinationCategories, getGeoChildren, pathForTownSlug } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS } from "@/app/lib/taxonomy";
import { TIER_WORD, rankForMonth, tierForMonth } from "@/app/components/browse/season";
import { SeasonStrip } from "@/app/components/browse/SeasonStrip";
import { trimText } from "@/app/components/browse/text";
import { StayPicks } from "@/app/components/guide/StayPicks";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SearchCard, type SearchItem } from "@/app/components/ui/SearchCard";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";

const SITE = "https://arctrips.com";

/**
 * The destination page, in the live site's language: an inset rounded banner
 * with the search card over its base, a counted stats strip, the overview set
 * in the centred reading column, and then the guides as light bordered cards
 * ordered by what this month is actually for.
 *
 * Things to do lives here rather than in the nav, which is why the guide grid
 * carries the "Things to do" eyebrow and why there is no tab for it above.
 *
 * Data, routing and the JSON-LD contract are unchanged: this is a rendering
 * change only.
 */
export async function DestinationHub({ citySlug, trail }: { citySlug: string; trail: GeoNode[] }) {
  const city = await getCity(citySlug);
  if (!city) notFound();

  const node = trail[trail.length - 1];
  const parent = trail[trail.length - 2];

  const [guides, categories, planning, listings, cats, areas, siblings, hubPhotos] = await Promise.all([
    getGuidesForCity(citySlug),
    getCityCategories(citySlug),
    getPlanningPieces(citySlug),
    getListings({ destinationSlug: citySlug }),
    getDestinationCategories(node.id),
    getGeoChildren(node.id, "area"),
    parent ? getGeoChildren(parent.id, "town") : Promise.resolve([]),
    getPhotos(citySlug),
  ]);

  const base = geoPath(trail);
  const month = new Date().getMonth() + 1;

  const monthsFor = (slug: string) => {
    const row = cats.find((c) => c.categorySlug === slug);
    return row?.bestMonths?.length ? row.bestMonths : CATEGORY_BEST_MONTHS[slug] ?? [];
  };

  // The guide's own opening sentence, taken from the one row that already
  // carries the article body, so the card says something real rather than
  // repeating its own title.
  const leadFor = new Map(
    categories.map((c) => [c.categorySlug, c.intro.find((b) => b.type === "p" && b.text)?.text] as const),
  );

  const ordered = [...guides].sort(
    (a, b) => rankForMonth(monthsFor(a.categorySlug), month) - rankForMonth(monthsFor(b.categorySlug), month),
  );
  const atBest = ordered.filter((g) => tierForMonth(monthsFor(g.categorySlug), month) === "peak");
  const placeCount = guides.reduce((n, g) => n + g.placeCount, 0);

  const nearby = await Promise.all(
    siblings
      .filter((t) => t.slug !== citySlug)
      .slice(0, 6)
      .map(async (t) => ({ node: t, path: await pathForTownSlug(t.slug) })),
  );

  const ancestry = trail.slice(0, -1).map((n) => n.name).reverse().join(", ");

  const searchIndex: SearchItem[] = [
    ...ordered.map((g) => ({
      label: g.name,
      sub: city.name,
      href: `${base}/things-to-do/${g.categorySlug}`,
    })),
    ...planning.map((a) => ({ label: a.title, sub: "Planning", href: `/guides/${a.slug}` })),
    ...nearby.map(({ node: t, path }) => ({ label: t.name, sub: "Destination", href: path })),
  ];

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

      <div className="dx">
        <div className="container">
          <Breadcrumb
            trail={[
              { href: "/destinations", label: "Destinations" },
              ...trail.slice(0, -1).map((n, i) => ({
                href: geoPath(trail.slice(0, i + 1)),
                label: n.name,
              })),
              { label: city.name },
            ]}
          />
        </div>

        <header className="hero">
          <div className="container">
            <div className="hero__b">
              <span className="hero__img">
                <Image
                  src={cld(city.heroPublicId, { w: 1800, h: 700, fit: "fill" })}
                  alt={city.name}
                  fill
                  priority
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                />
              </span>
              <div className="hero__t">
                {ancestry && <span className="hero__pill">{ancestry}</span>}
                <h1>{city.name}</h1>
                {city.standfirst && <p>{city.standfirst}</p>}
              </div>
            </div>
            <SearchCard
              items={searchIndex}
              placeholder={`Search ${city.name}`}
              note={`Searches every guide, planning piece and nearby destination for ${city.name}.`}
            />
          </div>
        </header>

        <section className="sec">
          <div className="container">
            <div className="stats">
              <div className="stat"><b>{guides.length}</b><span>Guides</span></div>
              <div className="stat"><b>{placeCount}</b><span>Places documented</span></div>
              <div className="stat"><b>{city.listingCount}</b><span>Stays</span></div>
              <div className="stat"><b>{atBest.length}</b><span>At their best now</span></div>
            </div>
          </div>
        </section>

        {city.overview.length > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="prose">
                {city.overview.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </section>
        )}

        {node.body.length > 0 && (
          <section className="sec sec--flush" id="about" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <div className="sechead center">
                <span className="eyebrow">The guide</span>
                <h2>{cleanText(city.name)}, in full.</h2>
              </div>
              <div className="dx-body">
                <BodyContents blocks={node.body} />
                <GuideBody blocks={node.body} photos={hubPhotos} />
              </div>
            </div>
          </section>
        )}

        {ordered.length > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="sechead center">
                <span className="eyebrow">Things to do</span>
                <h2>What there is to do in {city.name}.</h2>
                <p className="sub">
                  {ordered.length} guide{ordered.length === 1 ? "" : "s"}, {placeCount} named
                  place{placeCount === 1 ? "" : "s"}. Ordered by what is at its best this month.
                </p>
              </div>
              <div className="gguide">
                {ordered.map((g) => {
                  const months = monthsFor(g.categorySlug);
                  const tier = tierForMonth(months, month);
                  const lead = leadFor.get(g.categorySlug);
                  return (
                    <Link
                      className="gcard"
                      key={g.categorySlug}
                      href={`${base}/things-to-do/${g.categorySlug}`}
                    >
                      <div className="gcard__m">
                        <Image
                          src={g.heroPublicId ? cld(g.heroPublicId, { w: 520, h: 390, fit: "fill" }) : placeholder(520, 390)}
                          alt=""
                          width={520}
                          height={390}
                          sizes="(max-width: 700px) 100vw, 340px"
                        />
                      </div>
                      <div className="gcard__b">
                        <div className="gcard__top">
                          <h3>{g.name}</h3>
                          <span className={`tier tier--${tier}`}>{TIER_WORD[tier]}</span>
                        </div>
                        {lead && <p className="gcard__lead">{trimText(lead, 150)}</p>}
                        <SeasonStrip months={months} label={g.name} month={month} compact />
                        <p className="gcard__n">
                          {g.placeCount ? `${g.placeCount} places documented` : "Guide"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {planning.length > 0 && (
          <section className="sec sec--flush" id="planning" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <div className="panel panel--grey">
                <div className="sechead center">
                  <span className="eyebrow">Before you go</span>
                  <h2>The questions that decide the trip.</h2>
                  <p className="sub">
                    Not things to do. Weather, prices, where to sleep, and whether the month you were thinking of
                    is a mistake.
                  </p>
                </div>
                <div className="col">
                  <div className="idx">
                    {planning.map((a) => (
                      <Link className="idx__row" key={a.slug} href={`/guides/${a.slug}`}>
                        <span className="idx__media">
                          <Image
                            src={a.heroPublicId ? cld(a.heroPublicId, { w: 288, h: 216, fit: "fill" }) : placeholder(288, 216)}
                            alt=""
                            width={288}
                            height={216}
                            sizes="96px"
                          />
                        </span>
                        <span>
                          <span className="idx__t">{a.title}</span>
                          {a.excerpt && <span className="idx__d">{trimText(a.excerpt, 140)}</span>}
                        </span>
                        <span className="idx__v">Read</span>
                      </Link>
                    ))}
                  </div>
                  <p style={{ textAlign: "center", marginTop: 22 }}>
                    <Link className="btn btn--outline btn--sm" href={`${base}/plan`}>
                      Plan a trip to {city.name}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {(areas.length > 0 || nearby.length > 0) && (
          <section className="sec sec--flush">
            <div className="container">
              {areas.length > 0 && (
                <div className="sechead center">
                  <h2>Areas in {city.name}.</h2>
                  <p className="sub">The specific places people mean when they name this town.</p>
                </div>
              )}
              {areas.length > 0 && (
                <div className="catrow" style={{ marginBottom: nearby.length ? 34 : 0 }}>
                  {areas.map((a) => (
                    <Link className="cat" key={a.id} href={`${base}/${a.slug}`}>
                      <span className="cat__n">{a.name}</span>
                      <span className="cat__c">Area</span>
                    </Link>
                  ))}
                </div>
              )}
              {nearby.length > 0 && (
                <>
                  <div className="sechead center">
                    <h2>Nearby.</h2>
                    <p className="sub">Close enough to combine into one trip.</p>
                  </div>
                  <div className="catrow">
                    {nearby.map(({ node: t, path }) => (
                      <Link className="cat" key={t.id} href={path}>
                        <span className="cat__n">{t.name}</span>
                        <span className="cat__c">{t.standfirst ? "Full guide" : "Nearby"}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {listings.length > 0 && (
          <section className="sec sec--flush" id="stays" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <StayPicks
                listings={listings}
                cityName={city.name}
                stayCount={city.listingCount}
                seeAllHref="/"
              />
            </div>
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}

