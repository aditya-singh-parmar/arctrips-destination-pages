import Image from "next/image";
import Link from "next/link";
import {
  getArticlesForCity,
  getCity,
  getDestinations,
  getGuidesForCity,
  getListings,
  type Article,
  getCitySummaries,
  getReadingArticles,
} from "@/app/lib/content";
import { getAllGeoTrails, getAllGeoNodes, getAllDestinationCategories } from "@/app/lib/geo";
import { geoPath } from "@/app/lib/geo-types";
import { cld, IMG } from "@/app/lib/cloudinary";
import { CATEGORY_BEST_MONTHS, MONTH_NAME } from "@/app/lib/taxonomy";
import { itemList } from "@/app/lib/jsonld";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { SeasonLedger, type LedgerEntry } from "@/app/components/browse/SeasonLedger";
import { rankForMonth, tierForMonth } from "@/app/components/browse/season";
import { trimText } from "@/app/components/browse/text";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SearchCard, type SearchItem } from "@/app/components/ui/SearchCard";

const SITE = "https://arctrips.com";

/** How many reading items sit beside the feature. */
const READING_ROWS = 4;

/**
 * How many unpublished destinations get a card. The prototype greyed out two
 * of them, which reads as honest; twenty-one of them reads as an empty site.
 * Past this the rest are named on a line, which is the same admission in less
 * space and scales to the two hundred destinations the model has to hold.
 */
const SOON_CARDS = 4;

/**
 * `/destinations`, in the language of the live site: an inset rounded banner,
 * a white search card overlapping its base, and then alternating panels of
 * white, pale azure and grey with centred headings that end in a period.
 *
 * Things to do is a section of this page rather than a nav tab, because a
 * subject has exactly one home. It arrives as the almanac, on the three tier
 * season scale: a month that is not peak is not a dead month, it is the
 * cheaper and emptier one, which for a lot of people is the reason to go.
 *
 * Every figure is counted from the data, so the page reads as considered at
 * two destinations and holds its shape at twenty-four.
 */
export async function DestinationsLanding() {
  // Four bulk reads for the whole index instead of a fan-out per destination.
  // The previous shape issued hundreds of sequential queries and cost eighteen
  // seconds to first byte.
  const [destinations, trails, summaries, allCats, allNodes, reading0] = await Promise.all([
    getDestinations(),
    getAllGeoTrails(),
    getCitySummaries(),
    getAllDestinationCategories(),
    getAllGeoNodes(),
    getReadingArticles(),
  ]);
  const trailBySlug = new Map(
    trails
      .filter((t) => t[t.length - 1]?.type === "town")
      .map((t) => [t[t.length - 1].slug, t] as const),
  );
  const nodeBySlug = new Map(allNodes.filter((n) => n.type === "town").map((n) => [n.slug, n]));

  const month = new Date().getMonth() + 1;

  const rows = destinations.map((d) => {
      const summary = summaries.get(d.slug);
      const guides = summary?.guides ?? [];
      const hasGuides = guides.length > 0;
      const trail = trailBySlug.get(d.slug);
      const path = trail ? geoPath(trail) : "/destinations";
      const node = nodeBySlug.get(d.slug);
      const nodeId = node?.id;
      const cats = nodeId ? allCats.get(nodeId) ?? [] : [];

      // Per-town best_months where an editor set them, the taxonomy default
      // otherwise. Same precedence everywhere, so the month a guide shows here
      // is the month it shows on its own page.
      const monthsFor = (slug: string) => {
        const row = cats.find((c) => c.categorySlug === slug);
        return row?.bestMonths?.length ? row.bestMonths : CATEGORY_BEST_MONTHS[slug] ?? [];
      };
      const ranked = [...guides].sort(
        (a, b) => rankForMonth(monthsFor(a.categorySlug), month) - rankForMonth(monthsFor(b.categorySlug), month),
      );

      return {
        destination: d,
        city: hasGuides || (node?.body.length ?? 0) > 0 ? d : null,
        path,
        guides: ranked,
        monthsFor,
        articleCount: summary?.articleCount ?? 0,
        placeCount: summary?.placeCount ?? 0,
        stayCount: d.listingCount ?? 0,
        stayFrom: summary?.stayFrom,
        atBest: ranked.filter((g) => tierForMonth(monthsFor(g.categorySlug), month) === "peak"),
        // A town with an ingested document body is published content even
        // with no category guides. Twenty-one of twenty-seven are hub only,
        // and calling those "coming soon" while they serve a 14,000 word
        // guide is simply untrue.
        navigable: hasGuides || (node?.body.length ?? 0) > 0,
      };
  });

  const live = rows.filter((r) => r.navigable);
  const soon = rows.filter((r) => !r.navigable);

  const totals = {
    guides: live.reduce((n, r) => n + r.guides.length, 0),
    places: live.reduce((n, r) => n + r.placeCount, 0),
    stays: live.reduce((n, r) => n + r.stayCount, 0),
  };

  // One row per subject across the whole library, ordered by what this month
  // is actually for. The towns that carry it are named beneath it.
  type Subject = { slug: string; name: string; href: string; months: number[]; places: number; towns: string[] };
  const bySubject = new Map<string, Subject>();
  for (const r of live) {
    for (const g of r.guides) {
      const existing = bySubject.get(g.categorySlug);
      if (existing) {
        existing.places += g.placeCount;
        existing.towns.push(r.city!.name);
        continue;
      }
      bySubject.set(g.categorySlug, {
        slug: g.categorySlug,
        name: g.name,
        href: `${r.path}/things-to-do/${g.categorySlug}`,
        months: r.monthsFor(g.categorySlug),
        places: g.placeCount,
        towns: [r.city!.name],
      });
    }
  }
  const subjects = [...bySubject.values()].sort(
    (a, b) => rankForMonth(a.months, month) - rankForMonth(b.months, month) || a.name.localeCompare(b.name),
  );

  const ledger: LedgerEntry[] = subjects.map((s) => ({
    slug: s.slug,
    name: s.name,
    href: s.href,
    months: s.months,
    placeCount: s.places,
    state: "open",
    where: townList(s.towns),
  }));

  // Reading. Deduplicated across towns, since several pieces span two of them.
  const reading = dedupeArticles(reading0).filter((a) => a.heroPublicId && a.excerpt);
  const feature = reading[0];
  const rest = reading.slice(1, 1 + READING_ROWS);

  const searchIndex: SearchItem[] = [
    ...live.map((r) => ({ label: r.city!.name, sub: "Destination", href: r.path })),
    ...live.flatMap((r) =>
      r.guides.map((g) => ({
        label: g.name,
        sub: r.city!.name,
        href: `${r.path}/things-to-do/${g.categorySlug}`,
      })),
    ),
    ...reading.map((a) => ({ label: a.title, sub: "Reading", href: `/guides/${a.slug}` })),
  ];

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={itemList(
        live.map((r) => ({ name: r.city?.name ?? r.destination.name, url: `${SITE}${r.path}` })),
        "Arc Trips destinations",
      )} />

      <div className="dx">
        <header className="hero">
          <div className="container">
            <div className="hero__b">
              <span className="hero__img">
                <Image
                  src={cld(IMG.hero, { w: 1800, h: 760, fit: "fill" })}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                />
              </span>
              <div className="hero__t">
                <span className="hero__pill">Canada, British Columbia</span>
                <h1>Know the place before you go.</h1>
                <p>
                  Guides to where we stay, written after we have been. What to do, when to go, and what it is
                  actually like.
                </p>
              </div>
            </div>
            <SearchCard items={searchIndex} />
          </div>
        </header>

        <section className="sec">
          <div className="container">
            <div className="stats">
              <div className="stat"><b>{live.length}</b><span>Destinations</span></div>
              <div className="stat"><b>{totals.guides}</b><span>Guides</span></div>
              <div className="stat"><b>{totals.places}</b><span>Places documented</span></div>
              <div className="stat"><b>{totals.stays}</b><span>Stays</span></div>
            </div>
          </div>
        </section>

        <section className="sec sec--flush">
          <div className="container">
            <div className="sechead center">
              <h2>Every destination.</h2>
              <p className="sub">
                We publish a place once we have stayed in it, walked it in more than one season, and can answer
                the awkward questions.
              </p>
            </div>
            <div className="dgrid">
              {live.map((r) => (
                <Link className="dcard" key={r.destination.slug} href={r.path}>
                  <div className="dcard__m">
                    <Image
                      src={cld(r.city!.heroPublicId, { w: 620, h: 465, fit: "fill" })}
                      alt={r.city!.name}
                      width={620}
                      height={465}
                      sizes="(max-width: 520px) 100vw, (max-width: 980px) 50vw, 270px"
                    />
                    {r.atBest.length > 0 && (
                      <span className="dcard__tag">{r.atBest.length} at their best</span>
                    )}
                  </div>
                  <div className="dcard__b">
                    <h3>{r.city!.name}</h3>
                    <p className="dcard__meta">
                      {plural(r.guides.length, "guide")}  ·  {plural(r.placeCount, "place")}
                      {r.stayCount > 0 ? `  ·  ${plural(r.stayCount, "stay")}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
              {soon.slice(0, SOON_CARDS).map((r) => (
                <span className="dcard dcard--soon" key={r.destination.slug}>
                  <div className="dcard__m">
                    <Image
                      src={cld(r.destination.heroPublicId, { w: 620, h: 465, fit: "fill" })}
                      alt=""
                      width={620}
                      height={465}
                      sizes="(max-width: 520px) 100vw, (max-width: 980px) 50vw, 270px"
                    />
                  </div>
                  <div className="dcard__b">
                    <h3>{r.destination.name}</h3>
                    <p className="dcard__meta">Guides in review</p>
                  </div>
                </span>
              ))}
            </div>

            {soon.length > SOON_CARDS && (
              <p className="softnote" style={{ marginTop: 22, textAlign: "center" }}>
                <b>Also on the way.</b>{" "}
                {soon.slice(SOON_CARDS).map((r) => r.destination.name).join("  ·  ")}. We have not stayed in
                these properly enough to write about them yet.
              </p>
            )}
          </div>
        </section>

        {/* Things to do. Not a nav tab: a section of this page, on the three
            tier scale, because every month is worth something. */}
        {ledger.length > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="panel panel--azure">
                <div className="sechead center">
                  <span className="eyebrow">Things to do</span>
                  <h2>Every month is worth something.</h2>
                  <p className="sub">
                    Everything there is to do across our destinations, and when each one is at its best. The quiet
                    months are cheaper and emptier, which is why a lot of people pick them.
                  </p>
                </div>
                <div className="catrow">
                  {subjects.map((s) => (
                    <Link className="cat" key={s.slug} href={s.href}>
                      <span className="cat__n">{s.name}</span>
                      <span className="cat__c">{s.places ? `${s.places} places` : "guide"}</span>
                    </Link>
                  ))}
                </div>
                <SeasonLedger
                  entries={ledger}
                  month={month}
                  caption={`Everything there is to do across Arc Trips destinations, by month, for ${MONTH_NAME[month - 1]}`}
                />
              </div>
            </div>
          </section>
        )}

        {feature && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="sechead center">
                <h2>Latest from the guides.</h2>
                <p className="sub">Long reads written after we have been, not rewritten from a tourism board.</p>
              </div>
              <div className="read">
                <Link className="feat" href={`/guides/${feature.slug}`}>
                  <div className="feat__m">
                    <Image
                      src={cld(feature.heroPublicId, { w: 1000, h: 600, fit: "fill" })}
                      alt=""
                      width={1000}
                      height={600}
                      sizes="(max-width: 900px) 100vw, 560px"
                    />
                  </div>
                  <div className="kmeta">
                    <span className="k">{feature.category || "Guide"}</span>
                    <span className="dot" aria-hidden="true" />
                    <span>{(feature.citySlugs?.length ? cityNames(feature, live) : "Vancouver Island")}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{trimText(feature.excerpt, 190)}</p>
                </Link>
                <div>
                  {rest.map((a) => (
                    <Link className="ritem" key={a.slug} href={`/guides/${a.slug}`}>
                      <div className="ritem__m">
                        <Image
                          src={cld(a.heroPublicId, { w: 240, h: 180, fit: "fill" })}
                          alt=""
                          width={240}
                          height={180}
                          sizes="96px"
                        />
                      </div>
                      <div>
                        <div className="kmeta" style={{ marginTop: 0 }}>
                          <span className="k">{a.category || "Guide"}</span>
                        </div>
                        <h4>{a.title}</h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="sec sec--flush">
          <div className="container">
            <div className="panel panel--azure center">
              <h2>We write when the coast changes.</h2>
              <p className="sub">
                Four letters a year: when the greys arrive, when the surf turns, when the storms start, and when
                the trails dry out.
              </p>
              <form className="capture">
                <label className="sr-only" htmlFor="dx-capture">Email address</label>
                <input id="dx-capture" type="email" placeholder="Enter your email" required />
                <button className="btn btn--outline" type="submit">Sign up</button>
              </form>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (seen.has(a.slug) || a.slug.endsWith("-faq")) return false;
    seen.add(a.slug);
    return true;
  });
}

function cityNames(article: Article, live: { destination: { slug: string }; city: { name: string } | null }[]): string {
  const names = (article.citySlugs ?? [])
    .map((slug) => live.find((r) => r.destination.slug === slug)?.city?.name)
    .filter((n): n is string => Boolean(n));
  return names.length ? names.join(" and ") : "Vancouver Island";
}

/**
 * "Tofino and Ucluelet", then "Tofino, Ucluelet and 3 more". Chaining every
 * town with "and" was legible at two towns and unreadable at five, which is
 * what the full corpus actually has.
 */
const TOWNS_NAMED = 2;

/** "1 guide", not "1 guides". Counts come from the data, so they hit 1 often. */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function townList(towns: string[]): string {
  const unique = [...new Set(towns)];
  if (unique.length <= TOWNS_NAMED) return unique.join(" and ");
  return `${unique.slice(0, TOWNS_NAMED).join(", ")} and ${unique.length - TOWNS_NAMED} more`;
}

