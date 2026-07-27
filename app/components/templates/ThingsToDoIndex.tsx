import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, getGuidesForCity } from "@/app/lib/content";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { cld } from "@/app/lib/cloudinary";
import { breadcrumbList, itemList } from "@/app/lib/jsonld";
import { getDestinationCategories } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS, CATEGORY_BY_SLUG, MONTH_NAME, THEMES, seasonalRank } from "@/app/lib/taxonomy";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { SeasonLedger, type LedgerEntry } from "@/app/components/browse/SeasonLedger";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SectionHead } from "@/app/components/ui/SectionHead";

const SITE = "https://arctrips.com";

/**
 * The full category set for a town, so the destination hub can cap its own
 * modules without hiding anything and the whole set is crawlable in one hop.
 *
 * Rendered as the almanac grouped by taxonomy theme rather than as a card
 * grid: on this page the reader is comparing subjects against each other, and
 * a table of twelve shared month columns compares, where a wall of equal
 * cards does not. The theme grouping is the finite taxonomy in
 * `app/lib/taxonomy.ts`, so it holds at 4 guides and at 22.
 *
 * A town with no categories 404s rather than rendering an empty grid. That is
 * every Agent Trek city, which imports whole and has no category rows at all
 * (spec assumption A6, AC 5 and AC 18).
 */
export async function ThingsToDoIndex({ town, trail }: { town: GeoNode; trail: GeoNode[] }) {
  const [city, guides] = await Promise.all([getCity(town.slug), getGuidesForCity(town.slug)]);
  if (!city || guides.length === 0) notFound();

  const cats = await getDestinationCategories(town.id);
  const base = geoPath(trail);
  const todo = `${base}/things-to-do`;
  const month = new Date().getMonth() + 1;

  const monthsFor = (slug: string) => {
    const row = cats.find((c) => c.categorySlug === slug);
    return row?.bestMonths?.length ? row.bestMonths : CATEGORY_BEST_MONTHS[slug] ?? [];
  };

  const inSeasonNow = guides.filter((g) => monthsFor(g.categorySlug).includes(month));
  const lead = [...guides].sort(
    (a, b) => seasonalRank(monthsFor(a.categorySlug), month) - seasonalRank(monthsFor(b.categorySlug), month),
  )[0];

  // Grouped by the taxonomy theme, ordered by the taxonomy, with the guides
  // inside each theme ordered by what is in season now.
  const entries: LedgerEntry[] = THEMES.flatMap((theme) => {
    const inTheme = guides
      .filter((g) => CATEGORY_BY_SLUG.get(g.categorySlug)?.theme === theme.slug)
      .sort(
        (a, b) => seasonalRank(monthsFor(a.categorySlug), month) - seasonalRank(monthsFor(b.categorySlug), month),
      );
    return inTheme.map((g) => ({
      slug: g.categorySlug,
      name: g.name,
      href: `${todo}/${g.categorySlug}`,
      months: monthsFor(g.categorySlug),
      heroPublicId: g.heroPublicId,
      placeCount: g.placeCount,
      state: g.state,
      priceFrom: g.priceFrom,
      group: theme.name,
    }));
  });
  // Anything outside the finite taxonomy still has to render.
  const grouped = new Set(entries.map((e) => e.slug));
  for (const g of guides) {
    if (grouped.has(g.categorySlug)) continue;
    entries.push({
      slug: g.categorySlug,
      name: g.name,
      href: `${todo}/${g.categorySlug}`,
      months: monthsFor(g.categorySlug),
      heroPublicId: g.heroPublicId,
      placeCount: g.placeCount,
      state: g.state,
      priceFrom: g.priceFrom,
      group: "More",
    });
  }

  const bookable = guides.filter((g) => g.state === "live" || g.state === "sister").length;

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
      </div>

      {/* The lead guide's own photograph, not the town hero: this page is
          about the subjects, and it should not open on the same picture the
          destination page already used. */}
      <header className="dhero dhero--sm">
        {lead?.heroPublicId && (
          <div className="dhero__media">
            <Image
              src={cld(lead.heroPublicId, { w: 2000, fit: "limit" })}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        )}
        <div className="dhero__scrim" aria-hidden="true" />
        <div className="dhero__inner container">
          <p className="t-eyebrow t-eyebrow--invert">{city.name}</p>
          <h1 className="t-h0">Things to do</h1>
          <p className="dhero__meta">
            <span><b>{guides.length}</b> guides</span>
            {inSeasonNow.length > 0 && (
              <span><b>{inSeasonNow.length}</b> in season in {MONTH_NAME[month - 1]}</span>
            )}
            {bookable > 0 && <span><b>{bookable}</b> you can book today</span>}
          </p>
        </div>
      </header>

      <div className="container">
        <section className="section">
          <SectionHead
            ruled
            eyebrow="The year"
            title={`Every guide in ${city.name}, by month`}
            description={`Each one is an article, and where there is a trip to book it sits inside that article. ${MONTH_NAME[month - 1]} is the highlighted column.`}
            actionHref={base}
            actionLabel={`All of ${city.name}`}
          />
          <SeasonLedger
            entries={entries}
            month={month}
            caption={`Things to do in ${city.name}, grouped by theme, with the months each suits`}
          />
        </section>

        <section className="section section--open">
          <div className="closing">
            <p>
              <b>Somewhere to sleep.</b> Every guide points back to the same set of cabins, cottages and lodges
              in {city.name}, so nothing here ends without a way to book.
            </p>
            <Link className="btn btn--outline" href={`${base}#stays`}>See stays in {city.name}</Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
