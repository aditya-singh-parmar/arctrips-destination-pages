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
import { getDestinationCategories, getGeoChildren, pathForTownSlug } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS, MONTH_NAME, seasonalRank } from "@/app/lib/taxonomy";
import { seasonLabel } from "@/app/components/browse/BestTime";
import { SeasonLedger, type LedgerEntry } from "@/app/components/browse/SeasonLedger";
import { TRAVELLER_PROFILES } from "@/app/components/templates/PlanIndex";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SectionHead } from "@/app/components/ui/SectionHead";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { Rail } from "@/app/components/browse/Rail";
import { ListingCard } from "@/app/components/landing/ListingCard";

const SITE = "https://arctrips.com";

/**
 * The destination hub: the flagship page of the tree.
 *
 * Shape is an editorial spread, not a column of full-width bands. In order:
 * a full-bleed photograph with the title set on it, an asymmetric
 * orientation spread (prose left, spec rows and the page's single primary
 * action in a sticky rail right), then the almanac, which answers the
 * question the guest actually arrived with, then one photograph given the
 * whole width, then ruled indexes, then stays.
 *
 * Rhythm varies deliberately: flush under the hero, default around the
 * almanac, `--air` around the one thing that matters most, tight for the
 * context lists. Only two modules on the page use a card, and both are a
 * photograph plus a name plus a place, which is the one case where a card is
 * the right affordance.
 *
 * Data, routing and the JSON-LD contract are unchanged from the previous
 * build: this is a redesign of the rendering only.
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

  // Seasonal ordering (AC 48): what is in season now leads. Storm watching
  // rises in December and falls back in April, without an editor touching
  // sort_order.
  const month = new Date().getMonth() + 1;
  const monthsFor = (slug: string) => {
    const row = cats.find((c) => c.categorySlug === slug);
    return row?.bestMonths?.length ? row.bestMonths : CATEGORY_BEST_MONTHS[slug] ?? [];
  };
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
  const stayFrom = listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined;
  const currency = node.currency ?? trail[0]?.currency ?? "CAD";

  // What is actually in season this month, which is the line the hero and the
  // almanac head both lead on. Never fabricated: it is the same best_months
  // data the ledger draws its cells from.
  const inSeasonNow = ordered.filter((g) => monthsFor(g.categorySlug).includes(month));
  const lead = inSeasonNow[0] ?? ordered[0];
  const leadMonths = lead ? monthsFor(lead.categorySlug) : [];

  const ledger: LedgerEntry[] = ordered.map((g) => ({
    slug: g.categorySlug,
    name: g.name,
    href: `${base}/things-to-do/${g.categorySlug}`,
    months: monthsFor(g.categorySlug),
    heroPublicId: g.heroPublicId,
    placeCount: g.placeCount,
    state: g.state,
    priceFrom: g.priceFrom,
  }));

  const ancestry = trail.slice(0, -1).map((n) => n.name).reverse().join(", ");

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
      </div>

      {/* Photography earns the whole viewport. Type sits directly on it, held
          to the container grid so the title aligns with the prose below. */}
      <header className="dhero">
        <div className="dhero__media">
          <Image
            src={cld(city.heroPublicId, { w: 2000, fit: "limit" })}
            alt={city.name}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="dhero__scrim" aria-hidden="true" />
        <div className="dhero__inner container">
          {ancestry && <p className="t-eyebrow t-eyebrow--invert">{ancestry}</p>}
          <h1 className="t-display">{city.name}</h1>
          <p className="dhero__sub">{city.standfirst}</p>
          <p className="dhero__meta">
            <span><b>{guides.length}</b> guides</span>
            <span><b>{city.listingCount}</b> stays{stayFrom ? `, from $${stayFrom} a night` : ""}</span>
            {inSeasonNow.length > 0 && (
              <span><b>{inSeasonNow.length}</b> in season in {MONTH_NAME[month - 1]}</span>
            )}
          </p>
        </div>
      </header>

      <div className="container">
        {/* Orientation. Prose left, the numbers and the one primary action
            right, so a guest who only wants the facts never has to read. */}
        <section className="section">
          <div className="spread spread--wide">
            <div className="spread__main">
              <p className="lede">{city.overview[0]}</p>
              {city.overview.length > 1 && (
                <div className="prose">
                  {city.overview.slice(1).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              )}
            </div>

            <aside className="spread__rail brief">
              <p className="t-eyebrow">In brief</p>
              <dl className="spec">
                {facts.map((f) => (
                  <div className="spec__row" key={f.k}>
                    <dt className="spec__k">{f.k}</dt>
                    <dd className="spec__v">{f.v}</dd>
                  </div>
                ))}
                {lead && leadMonths.includes(month) && (
                  <div className="spec__row">
                    <dt className="spec__k">In season now</dt>
                    <dd className="spec__v spec__v--signal">{lead.name}</dd>
                  </div>
                )}
                <div className="spec__row">
                  <dt className="spec__k">Currency</dt>
                  <dd className="spec__v">{currency}</dd>
                </div>
                <div className="spec__row">
                  <dt className="spec__k">Stays</dt>
                  <dd className="spec__v">
                    {city.listingCount}
                    {stayFrom !== undefined && <span className="spec__note">From ${stayFrom} a night</span>}
                  </dd>
                </div>
              </dl>
              <Link className="btn btn--primary btn--block" href={`${base}#stays`}>
                See {city.listingCount} stays
              </Link>
              <p className="brief__fine">Real availability and pricing, booked on Arc Trips.</p>
            </aside>
          </div>
        </section>

        {/* The almanac. The answer to the question the guest arrived with,
            before anything is sold. */}
        {ledger.length > 0 && (
          <section className="section">
            <SectionHead
              ruled
              eyebrow="The year"
              title={`When to go in ${city.name}`}
              description={`Filled cells mark the months worth going for. ${MONTH_NAME[month - 1]} is the highlighted column.`}
              actionHref={`${base}/things-to-do`}
              actionLabel="All guides"
            />
            <SeasonLedger
              entries={ledger}
              month={month}
              caption={`Things to do in ${city.name}, by month, with what can be booked`}
            />
            <p className="ledger__note">
              Months come from what we have seen there, not from an average of the weather. Where there is a
              trip to book it sits inside the guide, never on this page.
            </p>
          </section>
        )}

        {/* The one thing that matters most, with air on both sides. */}
        {lead && (
          <section className="section section--air">
            <Link className="showcase bleed bleed--inset" href={`${base}/things-to-do/${lead.categorySlug}`}>
              <Image
                src={lead.heroPublicId ? cld(lead.heroPublicId, { w: 2000, fit: "limit" }) : placeholder(1600, 900)}
                alt={`${lead.name} in ${city.name}`}
                width={2000}
                height={1125}
                sizes="100vw"
              />
              <span className="showcase__scrim" aria-hidden="true" />
              <div className="showcase__cap">
                <span className="t-eyebrow t-eyebrow--invert">
                  {leadMonths.includes(month) ? `In season in ${MONTH_NAME[month - 1]}` : "Start here"}
                </span>
                <h2 className="t-h1">{lead.name} in {city.name}</h2>
                <p>
                  {[
                    lead.placeCount ? `${lead.placeCount} places` : undefined,
                    seasonLabel(leadMonths),
                    lead.priceFrom !== undefined ? `from $${lead.priceFrom}` : undefined,
                  ].filter(Boolean).join("  ·  ")}
                </p>
                <span className="showcase__go">Read the guide</span>
              </div>
            </Link>
          </section>
        )}

        {planning.length > 0 && (
          <section className="section" id="planning" style={{ scrollMarginTop: 96 }}>
            <SectionHead
              ruled
              eyebrow="Before you go"
              title="The questions that decide the trip"
              description="Not things to do. Weather, prices, where to sleep and when it is worth it."
              actionHref={`${base}/plan`}
              actionLabel="All planning"
            />
            <div className="spread spread--wide">
              <div className="spread__main">
                <div className="idx">
                  {planning.map((a) => (
                    <Link className="idx__row" key={a.slug} href={`/guides/${a.slug}`}>
                      <span className="idx__media">
                        <Image
                          src={a.heroPublicId ? cld(a.heroPublicId, { w: 464, h: 348, fit: "fill" }) : placeholder(464, 348)}
                          alt=""
                          width={232}
                          height={174}
                          sizes="116px"
                        />
                      </span>
                      <span className="idx__b">
                        <span className="idx__t">{a.title}</span>
                        {a.excerpt && <span className="idx__d">{a.excerpt}</span>}
                      </span>
                      <span className="idx__v">Read</span>
                    </Link>
                  ))}
                </div>
              </div>
              <aside className="spread__rail spread__rail--static">
                <p className="t-eyebrow">Who is going</p>
                <div className="profiles">
                  {TRAVELLER_PROFILES.map((pr) => (
                    <Link key={pr.slug} href={`${base}/plan?for=${pr.slug}`}>{pr.name}</Link>
                  ))}
                </div>
              </aside>
            </div>
          </section>
        )}

        {(areas.length > 0 || nearby.length > 0) && (
          <section className="section section--tight">
            <div className="pairs">
              {areas.length > 0 && (
                <div className="plist">
                  <h2>Areas in {city.name}</h2>
                  <p>The specific places people mean when they name this town.</p>
                  <ul>
                    {areas.map((a) => (
                      <li key={a.id}>
                        <Link href={`${base}/${a.slug}`}>
                          <Image
                            src={a.heroPublicId ? cld(a.heroPublicId, { w: 96, h: 96, fit: "fill" }) : placeholder(96, 96)}
                            alt=""
                            width={68}
                            height={68}
                          />
                          <b>{a.name}</b>
                          <span className="plist__v">Area</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nearby.length > 0 && (
                <div className="plist">
                  <h2>Nearby</h2>
                  <p>Close enough to combine into one trip.</p>
                  <ul>
                    {nearby.map(({ node: t, path }) => (
                      <li key={t.id}>
                        <Link href={path}>
                          <Image
                            src={t.heroPublicId ? cld(t.heroPublicId, { w: 96, h: 96, fit: "fill" }) : placeholder(96, 96)}
                            alt=""
                            width={68}
                            height={68}
                          />
                          <b>{t.name}</b>
                          <span className="plist__v">{t.standfirst ? "Full guide" : "Nearby"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {listings.length > 0 && (
          <section className="section section--open" id="stays" style={{ scrollMarginTop: 96 }}>
            <Rail
              title={`Where to stay in ${city.name}`}
              subtitle={`${city.listingCount} cabins, cottages and lodges${stayFrom ? `, from $${stayFrom} a night` : ""}`}
            >
              {listings.slice(0, 8).map((l) => (
                <ListingCard key={l.id} listing={l} variant="holiday" />
              ))}
            </Rail>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
