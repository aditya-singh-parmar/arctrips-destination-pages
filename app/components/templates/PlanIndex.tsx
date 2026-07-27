import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, getPlanningPieces, getListings } from "@/app/lib/content";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { breadcrumbList, itemList } from "@/app/lib/jsonld";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { Rail } from "@/app/components/browse/Rail";
import { ListingCard } from "@/app/components/landing/ListingCard";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SectionHead } from "@/app/components/ui/SectionHead";

const SITE = "https://arctrips.com";

/** The intent axis. Filters are query parameters, never folders, so the tree cannot explode. */
export const TRAVELLER_PROFILES = [
  { slug: "families", name: "Going with kids" },
  { slug: "adventure", name: "Adventure trip" },
  { slug: "slow", name: "Slow weekend" },
  { slug: "couples", name: "Couples" },
  { slug: "first-timers", name: "First timers" },
];

/**
 * Planning index for a town. Browse the practical pieces, filter by traveller
 * profile through query parameters.
 *
 * Reading-first, so it opens typographically rather than on a photograph: the
 * destination page and the things-to-do page both open on imagery, and three
 * photographic heroes in a row down one branch of the tree is monotony. The
 * pieces themselves are a ruled index, not a card grid, with a sticky stays
 * rail carrying the page's single primary action, since a guest reading about
 * when to go is exactly the guest who needs somewhere to sleep.
 *
 * A town with no planning pieces 404s rather than rendering empty.
 */
export async function PlanIndex({
  town,
  trail,
  profile,
}: {
  town: GeoNode;
  trail: GeoNode[];
  profile?: string;
}) {
  const [city, planning, listings] = await Promise.all([
    getCity(town.slug),
    getPlanningPieces(town.slug),
    getListings({ destinationSlug: town.slug }),
  ]);
  if (!city || planning.length === 0) notFound();

  const base = geoPath(trail);
  const plan = `${base}/plan`;
  const active = TRAVELLER_PROFILES.find((p) => p.slug === profile);
  const stayFrom = listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined;

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={breadcrumbList([
        { name: "Destinations", url: `${SITE}/destinations` },
        ...trail.map((n, i) => ({ name: n.name, url: `${SITE}${geoPath(trail.slice(0, i + 1))}` })),
        { name: "Plan your trip" },
      ])} />
      <JsonLd data={itemList(
        planning.map((a) => ({ name: a.title, url: `${SITE}/guides/${a.slug}` })),
        `Planning guides for ${city.name}`,
      )} />

      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            ...trail.slice(0, -1).map((n, i) => ({ href: geoPath(trail.slice(0, i + 1)), label: n.name })),
            { href: base, label: city.name },
            { label: "Plan your trip" },
          ]}
        />

        <header className="geohead">
          <span className="t-eyebrow">{city.name}</span>
          <h1 className="t-h0">Plan your trip</h1>
          <p className="geohead__sub">
            Not things to do, but the questions that decide the trip: weather, prices, crowds, and whether the
            month you were thinking of is a mistake.
          </p>
        </header>

        <div className="chiprow section section--dense" role="group" aria-label="Filter by traveller">
          <Link className={active ? "chip" : "chip chip--on"} href={plan}>Everyone</Link>
          {TRAVELLER_PROFILES.map((p) => (
            <Link
              key={p.slug}
              className={active?.slug === p.slug ? "chip chip--on" : "chip"}
              href={`${plan}?for=${p.slug}`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        {active && (
          <p className="softnote">
            Showing everything, filtered for {active.name.toLowerCase()}. Profile tagging arrives with the
            corpus import, so this view is not yet narrowed.
          </p>
        )}

        <section className="section section--flush" style={{ paddingTop: "var(--s-6)" }}>
          <div className="spread spread--wide">
            <div className="spread__main">
              <SectionHead
                ruled
                eyebrow={`${planning.length} piece${planning.length === 1 ? "" : "s"}`}
                title="Before you book anything"
              />
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

            <aside className="spread__rail brief">
              <p className="t-eyebrow">While you decide</p>
              <dl className="spec">
                <div className="spec__row">
                  <dt className="spec__k">Stays</dt>
                  <dd className="spec__v">
                    {city.listingCount}
                    {stayFrom !== undefined && <span className="spec__note">From ${stayFrom} a night</span>}
                  </dd>
                </div>
                <div className="spec__row">
                  <dt className="spec__k">Destination</dt>
                  <dd className="spec__v"><Link href={base}>{city.name}</Link></dd>
                </div>
                <div className="spec__row">
                  <dt className="spec__k">Things to do</dt>
                  <dd className="spec__v"><Link href={`${base}/things-to-do`}>All guides</Link></dd>
                </div>
              </dl>
              <Link className="btn btn--primary btn--block" href="#stays">
                See {city.listingCount} stays
              </Link>
              <p className="brief__fine">Real availability and pricing, booked on Arc Trips.</p>
            </aside>
          </div>
        </section>

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
