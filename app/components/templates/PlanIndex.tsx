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
import { StayPicks } from "@/app/components/guide/StayPicks";
import { trimText } from "@/app/components/browse/text";
import { JsonLd } from "@/app/components/ui/JsonLd";

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
 * Planning for a town: the practical pieces, filtered by traveller profile
 * through query parameters.
 *
 * Opens typographically rather than on a photograph. The destination page and
 * the things-to-do page both open on imagery, and three photographic banners
 * in a row down one branch is monotony. The pieces are a plain index in the
 * centred column, because a list should read as a list.
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

      <div className="dx">
        <div className="container">
          <Breadcrumb
            trail={[
              { href: "/destinations", label: "Destinations" },
              ...trail.slice(0, -1).map((n, i) => ({ href: geoPath(trail.slice(0, i + 1)), label: n.name })),
              { href: base, label: city.name },
              { label: "Plan your trip" },
            ]}
          />
        </div>

        <section className="sec">
          <div className="container">
            <div className="sechead center">
              <span className="eyebrow">{city.name}</span>
              <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)" }}>Plan your trip.</h2>
              <p className="sub">
                Not things to do, but the questions that decide the trip: weather, prices, crowds, and whether the
                month you were thinking of is a mistake.
              </p>
            </div>

            <div className="chiprow" role="group" aria-label="Filter by traveller">
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
          </div>
        </section>

        <section className="sec sec--flush">
          <div className="container">
            <div className="col">
              {active && (
                <p className="softnote" style={{ marginBottom: 24 }}>
                  Showing everything, filtered for {active.name.toLowerCase()}. Profile tagging arrives with the
                  rest of the corpus, so this view is not yet narrowed.
                </p>
              )}
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
            </div>
          </div>
        </section>

        {listings.length > 0 && (
          <section className="sec sec--flush" id="stays" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <StayPicks
                listings={listings}
                cityName={city.name}
                stayCount={city.listingCount}
                seeAllHref={`${base}#stays`}
                heading={`While you decide, three places to stay in ${city.name}.`}
              />
            </div>
          </section>
        )}

        <section className="sec sec--flush">
          <div className="container">
            <div className="closing">
              <p>
                <b>Ready to pick a month?</b> The almanac in {city.name} shows every guide against the whole year,
                so you can see what {city.name} is for in the month you were thinking of.
              </p>
              <Link className="btn btn--primary" href={`${base}/things-to-do`}>
                See the year in {city.name}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
