import Image from "next/image";
import Link from "next/link";
import { getDestinations, getCity, getGuidesForCity, getListings } from "@/app/lib/content";
import { getAllGeoTrails, getDestinationCategories, pathForTownSlug } from "@/app/lib/geo";
import { cld, IMG } from "@/app/lib/cloudinary";
import { CATEGORY_BEST_MONTHS, MONTH_NAME, seasonalRank } from "@/app/lib/taxonomy";
import { itemList } from "@/app/lib/jsonld";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { SeasonLedger, type LedgerEntry } from "@/app/components/browse/SeasonLedger";
import { seasonLabel } from "@/app/components/browse/BestTime";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SectionHead } from "@/app/components/ui/SectionHead";

const SITE = "https://arctrips.com";

/** Guides shown inside one destination entry before it defers to its own page. */
const GUIDES_PER_ENTRY = 4;
/** In-season rows contributed by one destination, so the almanac scales to 24 towns. */
const SEASON_ROWS_PER_DESTINATION = 4;

/**
 * `/destinations`, the home page of the destinations experience.
 *
 * It has one job: prove in the first screen that this is a planning
 * instrument and not a listings site. So it opens on the standard we publish
 * against, states the size of the library in real figures, and then leads
 * with the almanac, what is worth doing this month across every destination
 * we have. Only after that does it index the destinations themselves, and
 * each one arrives as an editorial entry carrying its own numbers rather
 * than as another photograph in a grid.
 *
 * Every figure on the page is read from the data: guide counts, documented
 * places, stay counts, from-prices, and which categories are in season this
 * month. Nothing is hand-written per destination, which is what lets the
 * page look considered at two destinations and hold at twenty-four.
 *
 * Coming-soon destinations render honestly, as names on a rule with no
 * photograph and no link, because they lead nowhere yet.
 *
 * Every destination href resolves through `pathForTownSlug`, so a town moving
 * between provinces or gaining a region is a data change, not an edit here.
 */
export async function DestinationsLanding() {
  const [destinations, trails] = await Promise.all([getDestinations(), getAllGeoTrails()]);
  const trailBySlug = new Map(
    trails
      .filter((t) => t[t.length - 1]?.type === "town")
      .map((t) => [t[t.length - 1].slug, t] as const),
  );

  const month = new Date().getMonth() + 1;

  const rows = await Promise.all(
    destinations.map(async (d) => {
      const guides = await getGuidesForCity(d.slug);
      const hasGuides = guides.length > 0;
      const trail = trailBySlug.get(d.slug);
      const [city, path, listings, cats] = await Promise.all([
        hasGuides ? getCity(d.slug) : Promise.resolve(null),
        pathForTownSlug(d.slug),
        hasGuides ? getListings({ destinationSlug: d.slug }) : Promise.resolve([]),
        hasGuides && trail ? getDestinationCategories(trail[trail.length - 1].id) : Promise.resolve([]),
      ]);

      // Per-town best_months where an editor has set them, the taxonomy
      // default otherwise. Same precedence as the destination hub, so the
      // month a guide shows here is the month it shows there.
      const monthsFor = (slug: string) => {
        const row = cats.find((c) => c.categorySlug === slug);
        return row?.bestMonths?.length ? row.bestMonths : CATEGORY_BEST_MONTHS[slug] ?? [];
      };
      const ranked = [...guides].sort(
        (a, b) => seasonalRank(monthsFor(a.categorySlug), month) - seasonalRank(monthsFor(b.categorySlug), month),
      );

      return {
        destination: d,
        city,
        path,
        guides: ranked,
        monthsFor,
        placeCount: guides.reduce((n, g) => n + g.placeCount, 0),
        stayFrom: listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined,
        inSeason: ranked.filter((g) => monthsFor(g.categorySlug).includes(month)),
        navigable: hasGuides && city !== null,
      };
    }),
  );

  const live = rows.filter((r) => r.navigable && r.city);
  const soon = rows.filter((r) => !r.navigable);

  const totals = {
    guides: live.reduce((n, r) => n + r.guides.length, 0),
    places: live.reduce((n, r) => n + r.placeCount, 0),
    stays: live.reduce((n, r) => n + (r.city?.listingCount ?? 0), 0),
    from: live.map((r) => r.stayFrom).filter((n): n is number => n !== undefined),
  };

  // The destination with the most in season right now leads, so the page's
  // one primary action changes with the calendar rather than with an editor.
  const leadRow = [...live].sort((a, b) => b.inSeason.length - a.inSeason.length)[0];

  const seasonEntries: LedgerEntry[] = live
    .filter((r) => r.inSeason.length > 0)
    .sort((a, b) => b.inSeason.length - a.inSeason.length)
    .flatMap((r) =>
      r.inSeason.slice(0, SEASON_ROWS_PER_DESTINATION).map((g) => ({
        slug: `${r.destination.slug}-${g.categorySlug}`,
        name: g.name,
        href: `${r.path}/things-to-do/${g.categorySlug}`,
        months: r.monthsFor(g.categorySlug),
        heroPublicId: g.heroPublicId,
        placeCount: g.placeCount,
        state: g.state,
        priceFrom: g.priceFrom,
        group: r.city?.name ?? r.destination.name,
      })),
    );

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={itemList(
        live.map((r) => ({ name: r.city?.name ?? r.destination.name, url: `${SITE}${r.path}` })),
        "Arc Trips destinations",
      )} />

      <div className="container">
        {/* Orientation. The standard we publish against, and the size of the
            library in real figures, before any photography. */}
        <section className="section">
          <div className="spread spread--wide">
            <div className="spread__main">
              <span className="t-eyebrow">Arc Trips destinations</span>
              <h1 className="t-h0">The places we know properly</h1>
              <p className="lede">
                A destination goes live here once we have stayed in it, walked it in more than one season, and can
                answer the awkward questions. Not when someone has written a page about it.
              </p>
              <div className="prose">
                <p>
                  Each destination is a set of guides rather than a list of things to buy. A guide tells you what a
                  place is actually like, which months are worth the trip, where the specific spots are, and what
                  you can book once you have decided. The booking sits inside the guide, at the end, where it
                  belongs.
                </p>
                <p>
                  That is why the library grows slowly. What is below is everything we can stand behind today.
                </p>
              </div>
            </div>

            <aside className="spread__rail brief">
              <p className="t-eyebrow">The library</p>
              <dl className="spec">
                <div className="spec__row">
                  <dt className="spec__k">Destinations</dt>
                  <dd className="spec__v">{live.length}</dd>
                </div>
                <div className="spec__row">
                  <dt className="spec__k">Guides</dt>
                  <dd className="spec__v">{totals.guides}</dd>
                </div>
                {totals.places > 0 && (
                  <div className="spec__row">
                    <dt className="spec__k">Places documented</dt>
                    <dd className="spec__v">{totals.places}</dd>
                  </div>
                )}
                <div className="spec__row">
                  <dt className="spec__k">Stays</dt>
                  <dd className="spec__v">
                    {totals.stays}
                    {totals.from.length > 0 && (
                      <span className="spec__note">From ${Math.min(...totals.from)} a night</span>
                    )}
                  </dd>
                </div>
                {leadRow && leadRow.inSeason.length > 0 && (
                  <div className="spec__row">
                    <dt className="spec__k">Best right now</dt>
                    <dd className="spec__v spec__v--signal">
                      {leadRow.city?.name ?? leadRow.destination.name}
                      <span className="spec__note">
                        {leadRow.inSeason.length} guides in season in {MONTH_NAME[month - 1]}
                      </span>
                    </dd>
                  </div>
                )}
                {soon.length > 0 && (
                  <div className="spec__row">
                    <dt className="spec__k">Publishing next</dt>
                    <dd className="spec__v">{soon.map((r) => r.destination.name).join(", ")}</dd>
                  </div>
                )}
              </dl>
              {leadRow && (
                <Link className="btn btn--primary btn--block" href={leadRow.path}>
                  Start with {leadRow.city?.name ?? leadRow.destination.name}
                </Link>
              )}
              <p className="brief__fine">
                Updated whenever a guide is. The figures above are counted, not claimed.
              </p>
            </aside>
          </div>
        </section>

        {/* The almanac, across destinations. This is the thing no other
            travel product puts on its index page. */}
        {seasonEntries.length > 0 && (
          <section className="section">
            <SectionHead
              ruled
              eyebrow="Right now"
              title={`What is worth doing in ${MONTH_NAME[month - 1]}`}
              description="Every guide that is in season this month, across every destination we have published. Filled cells are the months worth going for."
              actionHref="/things-to-do"
              actionLabel="Browse by activity"
            />
            <SeasonLedger
              entries={seasonEntries}
              month={month}
              caption={`Guides in season in ${MONTH_NAME[month - 1]}, grouped by destination`}
            />
            <p className="ledger__note">
              Months come from what we have seen in each place, not from an average of the weather. A guide that is
              out of season is still worth reading: it is often the cheapest and quietest time to go.
            </p>
          </section>
        )}

        {/* The index. One editorial entry per destination, alternating sides,
            each carrying its own figures. Reads as considered at two and
            holds its shape at twenty-four. */}
        <section className="section">
          <SectionHead
            ruled
            eyebrow="The index"
            title="Every destination"
            description="What each one is, what we have written about it, and what it costs to sleep there."
          />
          <div className="dentries">
            {live.map((r) => {
              const city = r.city!;
              const shown = r.guides.slice(0, GUIDES_PER_ENTRY);
              const more = r.guides.length - shown.length;
              return (
                <article className="dentry" key={r.destination.slug}>
                  <Link className="dentry__media" href={r.path} aria-label={city.name}>
                    <Image
                      src={cld(city.heroPublicId, { w: 1200, h: 900, fit: "fill" })}
                      alt={city.name}
                      width={1200}
                      height={900}
                      sizes="(max-width: 860px) 100vw, 46vw"
                    />
                  </Link>

                  <div className="dentry__b">
                    <span className="t-eyebrow">{r.destination.region}</span>
                    <h3 className="t-h2"><Link href={r.path}>{city.name}</Link></h3>
                    <p className="dentry__sub">{city.standfirst}</p>

                    <dl className="spec spec--tight spec--split">
                      <div className="spec__row">
                        <dt className="spec__k">Guides</dt>
                        <dd className="spec__v">{r.guides.length}</dd>
                      </div>
                      <div className="spec__row">
                        <dt className="spec__k">Places</dt>
                        <dd className="spec__v">{r.placeCount}</dd>
                      </div>
                      <div className="spec__row">
                        <dt className="spec__k">Stays</dt>
                        <dd className="spec__v">
                          {city.listingCount}
                          {r.stayFrom !== undefined ? `, from $${r.stayFrom}` : ""}
                        </dd>
                      </div>
                      <div className="spec__row">
                        <dt className="spec__k">In season</dt>
                        <dd className={r.inSeason.length ? "spec__v spec__v--signal" : "spec__v"}>
                          {r.inSeason.length ? `${r.inSeason.length} in ${MONTH_NAME[month - 1]}` : "Quiet season"}
                        </dd>
                      </div>
                    </dl>

                    <ul className="dentry__guides">
                      {shown.map((g) => (
                        <li key={g.categorySlug}>
                          <Link href={`${r.path}/things-to-do/${g.categorySlug}`}>
                            <b>{g.name}</b>
                            <span className="dentry__when">
                              {seasonLabel(r.monthsFor(g.categorySlug)) ?? "All year"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <p className="dentry__go">
                      <Link href={r.path}>
                        {more > 0 ? `${more} more guides in ${city.name}` : `Open the ${city.name} guide`}
                      </Link>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Honest, unlinked, and photograph-free: these places lead nowhere
            yet, so they are set as names on a rule rather than as cards. */}
        {soon.length > 0 && (
          <section className="section section--open">
            <div className="notyet">
              <span className="t-eyebrow">Not published yet</span>
              <p className="notyet__names">{soon.map((r) => r.destination.name).join("  ·  ")}</p>
              <p className="notyet__note">
                We have not stayed in these properly enough to write about them. When we have, they arrive with the
                same guides, the same months, and the same numbers as everything above.
              </p>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
