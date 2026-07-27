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
 * profile through query parameters. Carries a persistent stays module, since
 * a guest planning a trip needs somewhere to sleep and this is the highest
 * intent placement on the page.
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

      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            ...trail.slice(0, -1).map((n, i) => ({ href: geoPath(trail.slice(0, i + 1)), label: n.name })),
            { href: base, label: city.name },
            { label: "Plan your trip" },
          ]}
        />

        <div className="section" style={{ paddingBottom: 8 }}>
          <div className="rowhead">
            <div>
              <h1 className="t-h1">Plan your trip to {city.name}</h1>
              <p className="t-reg-14" style={{ marginTop: 6 }}>
                Not things to do, but the questions that decide the trip.
              </p>
            </div>
          </div>
        </div>

        <div className="chiprow" role="group" aria-label="Filter by traveller">
          <Link className="chip" href={plan} data-active={!active}>Everyone</Link>
          {TRAVELLER_PROFILES.map((p) => (
            <Link
              key={p.slug}
              className="chip"
              href={`${plan}?for=${p.slug}`}
              data-active={active?.slug === p.slug}
            >
              {p.name}
            </Link>
          ))}
        </div>

        {active && (
          <p className="softnote" style={{ marginTop: 14 }}>
            Showing everything, filtered for {active.name.toLowerCase()}. Profile tagging arrives with the
            corpus import, so this view is not yet narrowed.
          </p>
        )}

        <div className="pcardgrid" style={{ marginTop: 18 }}>
          {planning.map((a) => (
            <Link className="pcard" key={a.slug} href={`/guides/${a.slug}`}>
              <div className="pcard__media">
                <Image
                  src={a.heroPublicId ? cld(a.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)}
                  alt={a.title}
                  width={380}
                  height={260}
                  sizes="172px"
                />
              </div>
              <h4 className="pcard__title">{a.title}</h4>
              {a.excerpt && <p className="pcard__meta">{a.excerpt}</p>}
            </Link>
          ))}
        </div>

        {listings.length > 0 && (
          <div id="stays" style={{ scrollMarginTop: 96, marginTop: 8 }}>
            <Rail
              title={`Where to stay in ${city.name}`}
              subtitle={`${listings.length} cabins, cottages and lodges`}
            >
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
