import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, getGuidesForCity } from "@/app/lib/content";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { cld } from "@/app/lib/cloudinary";
import { breadcrumbList, itemList } from "@/app/lib/jsonld";
import { getDestinationCategories } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS, CATEGORY_BY_SLUG, MONTH_NAME, THEMES } from "@/app/lib/taxonomy";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { SeasonLedger, type LedgerEntry } from "@/app/components/browse/SeasonLedger";
import { rankForMonth, tierForMonth } from "@/app/components/browse/season";
import { JsonLd } from "@/app/components/ui/JsonLd";

const SITE = "https://arctrips.com";

/**
 * The full subject set for a town, so the destination page can cap its own
 * modules without hiding anything and the whole set is crawlable in one hop.
 *
 * Rendered as the almanac grouped by taxonomy theme rather than as a second
 * card grid: on this page the reader is comparing subjects against each other,
 * and a table of twelve shared month columns compares where a wall of equal
 * cards does not.
 *
 * A town with no subjects 404s rather than rendering an empty grid.
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

  const atBest = guides.filter((g) => tierForMonth(monthsFor(g.categorySlug), month) === "peak");
  const lead = [...guides].sort(
    (a, b) => rankForMonth(monthsFor(a.categorySlug), month) - rankForMonth(monthsFor(b.categorySlug), month),
  )[0];

  const toEntry = (g: (typeof guides)[number], group: string): LedgerEntry => ({
    slug: g.categorySlug,
    name: g.name,
    href: `${todo}/${g.categorySlug}`,
    months: monthsFor(g.categorySlug),
    heroPublicId: g.heroPublicId,
    placeCount: g.placeCount,
    state: g.state,
    priceFrom: g.priceFrom,
    group,
  });

  const entries: LedgerEntry[] = THEMES.flatMap((theme) =>
    guides
      .filter((g) => CATEGORY_BY_SLUG.get(g.categorySlug)?.theme === theme.slug)
      .sort(
        (a, b) => rankForMonth(monthsFor(a.categorySlug), month) - rankForMonth(monthsFor(b.categorySlug), month),
      )
      .map((g) => toEntry(g, theme.name)),
  );
  // Anything outside the finite taxonomy still has to render.
  const grouped = new Set(entries.map((e) => e.slug));
  for (const g of guides) {
    if (!grouped.has(g.categorySlug)) entries.push(toEntry(g, "More"));
  }

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

      <div className="dx">
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
            about the subjects, and it should not open on the picture the
            destination page already used. */}
        <header className="hero">
          <div className="container">
            <div className="hero__b hero__b--sm">
              {lead?.heroPublicId && (
                <span className="hero__img">
                  <Image
                    src={cld(lead.heroPublicId, { w: 1800, h: 620, fit: "fill" })}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    style={{ objectFit: "cover" }}
                  />
                </span>
              )}
              <div className="hero__t">
                <span className="hero__pill">{city.name}</span>
                <h1>Things to do</h1>
                <p className="hero__meta">
                  <span><b>{guides.length}</b> guides</span>
                  {atBest.length > 0 && (
                    <span><b>{atBest.length}</b> at their best in {MONTH_NAME[month - 1]}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="sec">
          <div className="container">
            <div className="panel panel--azure">
              <div className="sechead center">
                <span className="eyebrow">The year</span>
                <h2>Every month is worth something.</h2>
                <p className="sub">
                  Every guide in {city.name}, grouped by what it is, and when each one is at its best. The quiet
                  months are cheaper and emptier, which is why a lot of people pick them.
                </p>
              </div>
              <SeasonLedger
                entries={entries}
                month={month}
                caption={`Things to do in ${city.name}, grouped by theme, with the months each suits`}
              />
            </div>
          </div>
        </section>

        <section className="sec sec--flush">
          <div className="container">
            <div className="closing">
              <p>
                <b>Somewhere to sleep.</b> Every guide points back to the same cabins, cottages and lodges in{" "}
                {city.name}, so nothing here ends without a way to book.
              </p>
              <Link className="btn btn--primary" href={`${base}#stays`}>
                See stays in {city.name}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
