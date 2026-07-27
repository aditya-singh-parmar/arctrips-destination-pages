import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, getGuidesForCity, getListings } from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { breadcrumbList, faqPage, itemList } from "@/app/lib/jsonld";
import { getDestinationCategories } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS, MONTH_NAME } from "@/app/lib/taxonomy";
import { BestTime, seasonLabel } from "@/app/components/browse/BestTime";
import { SeasonLedger, type LedgerEntry } from "@/app/components/browse/SeasonLedger";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SectionHead } from "@/app/components/ui/SectionHead";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { FaqList } from "@/app/components/browse/FaqList";
import { BookingRail } from "@/app/components/guide/BookingRail";
import { GuideBody, splitSections } from "@/app/components/guide/GuideBody";

const SITE = "https://arctrips.com";

type Block = { type: string; text?: string };

function leadIndex(intro: Block[]): number {
  return intro.findIndex((b) => b.type === "p" && b.text);
}

export function lead(intro: Block[]): string | undefined {
  const i = leadIndex(intro);
  if (i === -1) return undefined;
  const p = intro[i].text as string;
  return p.length > 220 ? `${p.slice(0, 217)}...` : p;
}

/**
 * The lead paragraph is promoted into the hero as the standfirst, so it must
 * not also open the body. Without this every guide repeats its first
 * paragraph, which is invisible on a 9,000 word guide and is the entire page
 * on a short one.
 */
function bodyBlocks<T extends Block>(intro: T[]): T[] {
  const i = leadIndex(intro);
  return i === -1 ? intro : intro.filter((_, n) => n !== i);
}

/**
 * The category guide: the long-form surface, up to 338 blocks and 9,000
 * words. The article body IS a `city_categories.intro` row, and places
 * render as sections within it, never as separate pages.
 *
 * Reading order puts the data first, which is the whole product argument:
 * hero, then a facts band carrying the season strip and the spec rows, then
 * the article. Booking is a persistent rail beside the body on desktop,
 * stacking below on mobile (`BookingRail`, driven entirely by `resolveCta`),
 * and it carries the page's single `.btn--primary`.
 *
 * The onward block at the foot is the almanac rather than a fourth card
 * grid, so a reader who finishes a guide lands on the same "when to go"
 * instrument they met on the hub.
 */
export async function CategoryGuide({
  citySlug,
  categorySlug,
  trail,
}: {
  citySlug: string;
  categorySlug: string;
  trail: GeoNode[];
}) {
  const guide = await getGuide(citySlug, categorySlug);
  if (!guide) notFound();

  const node = trail[trail.length - 1];
  const [listings, siblings, cats] = await Promise.all([
    getListings({ destinationSlug: citySlug }),
    getGuidesForCity(citySlug),
    getDestinationCategories(node.id),
  ]);
  const monthsFor = (slug: string) => {
    const row = cats.find((c) => c.categorySlug === slug);
    return row?.bestMonths?.length ? row.bestMonths : CATEGORY_BEST_MONTHS[slug] ?? [];
  };
  const bestMonths = monthsFor(categorySlug);
  const others = siblings.filter((g) => g.categorySlug !== categorySlug);
  const stayFrom = listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined;
  const standfirst = lead(guide.intro);
  const base = geoPath(trail);
  const month = new Date().getMonth() + 1;
  const self = siblings.find((g) => g.categorySlug === categorySlug);

  // Long guides had no way to move around inside them: 28 headings, no contents.
  const contents = splitSections(bodyBlocks(guide.intro))
    .filter((sec) => sec.heading?.text)
    .map((sec) => ({ index: sec.index, text: sec.heading!.text as string }));

  const selfUrl = `${SITE}${base}/things-to-do/${categorySlug}`;
  const season = seasonLabel(bestMonths);
  const inSeasonNow = bestMonths.includes(month);

  const onward: LedgerEntry[] = others.map((g) => ({
    slug: g.categorySlug,
    name: g.name,
    href: `${base}/things-to-do/${g.categorySlug}`,
    months: monthsFor(g.categorySlug),
    heroPublicId: g.heroPublicId,
    placeCount: g.placeCount,
    state: g.state,
    priceFrom: g.priceFrom,
  }));

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={breadcrumbList([
        { name: "Destinations", url: `${SITE}/destinations` },
        ...trail.map((n, i) => ({ name: n.name, url: `${SITE}${geoPath(trail.slice(0, i + 1))}` })),
        { name: guide.categoryName },
      ])} />
      <JsonLd data={faqPage(guide.faqs)} />
      <JsonLd data={itemList(
        guide.places.map((pl) => ({ name: pl.name, url: `${selfUrl}#${pl.slug}` })),
        `${guide.categoryName} in ${guide.cityName}`,
      )} />

      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            ...trail.slice(0, -1).map((node, i) => ({
              href: geoPath(trail.slice(0, i + 1)),
              label: node.name,
            })),
            { href: base, label: guide.cityName },
            { label: guide.categoryName },
          ]}
        />
      </div>

      <header className="dhero dhero--sm">
        {guide.heroPublicId && (
          <div className="dhero__media">
            <Image
              src={cld(guide.heroPublicId, { w: 2000, fit: "limit" })}
              alt={`${guide.categoryName} in ${guide.cityName}`}
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        )}
        <div className="dhero__scrim" aria-hidden="true" />
        <div className="dhero__inner container">
          <p className="t-eyebrow t-eyebrow--invert">{guide.cityName}</p>
          <h1 className="t-h0">{guide.categoryName}</h1>
          {standfirst && <p className="dhero__sub">{standfirst}</p>}
        </div>
      </header>

      <div className="container">
        {/* Data before prose. The season strip is the first thing under the
            photograph, because "when should I go" is the question that
            brought the reader here. */}
        <section className="section section--tight">
          <div className="guideled">
            <dl className="spec">
              <div className="spec__row">
                <dt className="spec__k">Best months</dt>
                <dd className={inSeasonNow ? "spec__v spec__v--signal" : "spec__v"}>
                  {season ?? "All year"}
                  {inSeasonNow && <span className="spec__note">In season now, in {MONTH_NAME[month - 1]}</span>}
                </dd>
              </div>
              {guide.places.length > 0 && (
                <div className="spec__row">
                  <dt className="spec__k">Places covered</dt>
                  <dd className="spec__v">{guide.places.length}</dd>
                </div>
              )}
              <div className="spec__row">
                <dt className="spec__k">To book</dt>
                <dd
                  className={
                    self?.state === "soon"
                      ? "spec__v spec__v--soon"
                      : self?.state === "live"
                        ? "spec__v spec__v--signal"
                        : "spec__v"
                  }
                >
                  {bookLabel(self?.state, self?.priceFrom, guide.experiences.length)}
                </dd>
              </div>
              <div className="spec__row">
                <dt className="spec__k">Where to stay</dt>
                <dd className="spec__v">
                  <Link href={`${base}#stays`}>{guide.cityName}</Link>
                  {stayFrom !== undefined && <span className="spec__note">From ${stayFrom} a night</span>}
                </dd>
              </div>
            </dl>
            <div>
              <BestTime months={bestMonths} label={`${guide.categoryName.toLowerCase()} in ${guide.cityName}`} />
            </div>
          </div>
        </section>

        <div className="guidelayout">
          <article>
            <GuideBody blocks={bodyBlocks(guide.intro)} photos={guide.photos} />

            {guide.places.length > 0 && (
              <section id="places" style={{ scrollMarginTop: 96 }}>
                <SectionHead
                  ruled
                  eyebrow={guide.categoryName}
                  title={`${guide.places.length} places in ${guide.cityName}`}
                />
                {guide.places.length > 4 && (
                  <nav className="placejump" aria-label="Jump to a place">
                    {guide.places.map((p) => (
                      <a key={p.id} href={`#${p.slug}`}>{p.name}</a>
                    ))}
                  </nav>
                )}
                <div className="guide-places">
                  {guide.places.map((p) => (
                    <section className="guide-place" id={p.slug} key={p.id} style={{ scrollMarginTop: 96 }}>
                      <h2 className="ar-h2">{p.name}</h2>
                      {p.blurb && <p className="guide-place__blurb">{p.blurb}</p>}
                      <ArticleBlocks blocks={p.body} lead={false} />
                      {p.goodFor.length > 0 && (
                        <div className="goodfor">
                          {p.goodFor.map((g) => <span key={g}>{g}</span>)}
                        </div>
                      )}
                      {p.goodToKnow && <p className="ar-note"><b>Good to know.</b> {p.goodToKnow}</p>}
                    </section>
                  ))}
                </div>
              </section>
            )}

            {guide.faqs.length > 0 && (
              <section id="faq" style={{ marginTop: "var(--s-8)", scrollMarginTop: 96 }}>
                <SectionHead ruled eyebrow="Asked before" title="Common questions" />
                <FaqList faqs={guide.faqs} />
              </section>
            )}

            {guide.related.length > 0 && (
              <section style={{ marginTop: "var(--s-8)" }}>
                <SectionHead
                  ruled
                  eyebrow="Related reading"
                  title={`More on ${guide.categoryName.toLowerCase()}`}
                  as="h2"
                />
                <div className="idx idx--compact">
                  {guide.related.map((a) => (
                    <Link className="idx__row" key={a.slug} href={`/guides/${a.slug}`}>
                      <span className="idx__media">
                        <Image
                          src={a.heroPublicId ? cld(a.heroPublicId, { w: 304, h: 228, fit: "fill" }) : placeholder(304, 228)}
                          alt=""
                          width={152}
                          height={114}
                          sizes="76px"
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
              </section>
            )}
          </article>

          <div className="guiderail-stack">
            {contents.length > 2 && (
              <nav className="toc" aria-label="On this page">
                <p className="toc__label">On this page</p>
                <ol>
                  {contents.map((c) => (
                    <li key={c.index}><a href={`#s-${c.index}`}>{c.text}</a></li>
                  ))}
                  {guide.places.length > 0 && <li><a href="#places">The {guide.categoryName.toLowerCase()}</a></li>}
                  {guide.faqs.length > 0 && <li><a href="#faq">Common questions</a></li>}
                </ol>
              </nav>
            )}
            <BookingRail
              cta={guide.cta}
              experiences={guide.experiences}
              citySlug={citySlug}
              cityPath={base}
              cityName={guide.cityName}
              stayCount={listings.length}
              stayFrom={stayFrom}
              listings={listings}
            />
          </div>
        </div>

        {onward.length > 0 && (
          <section className="section section--open">
            <SectionHead
              ruled
              eyebrow="Keep going"
              title={`The rest of the year in ${guide.cityName}`}
              description="Every other guide in this destination, and the months each one is worth the trip."
              actionHref={base}
              actionLabel={`All of ${guide.cityName}`}
            />
            <SeasonLedger
              entries={onward}
              month={month}
              caption={`Other things to do in ${guide.cityName}, by month`}
            />
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}

function bookLabel(state: string | undefined, priceFrom: number | undefined, experiences: number): string {
  if (state === "soon") return "Coming soon to Arc Trips";
  if (state === "sister") return "Arc Trips Fishing";
  if (state === "live") {
    const n = experiences > 0 ? `${experiences} trip${experiences === 1 ? "" : "s"}` : "Trips";
    return priceFrom !== undefined ? `${n}, from $${priceFrom}` : n;
  }
  return "Free to visit";
}
