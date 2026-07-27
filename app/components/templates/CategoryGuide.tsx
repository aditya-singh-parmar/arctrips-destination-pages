import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, getGuidesForCity, getListings } from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { breadcrumbList, faqPage, itemList } from "@/app/lib/jsonld";
import { getDestinationCategories } from "@/app/lib/geo";
import { CATEGORY_BEST_MONTHS } from "@/app/lib/taxonomy";
import { SeasonStrip, SeasonLegend } from "@/app/components/browse/SeasonStrip";
import { TIER_WORD, rankForMonth, tierForMonth } from "@/app/components/browse/season";
import { FaqList } from "@/app/components/browse/FaqList";
import { cleanText, trimText } from "@/app/components/browse/text";
import { GuideBody } from "@/app/components/guide/GuideBody";
import { PlaceEntries } from "@/app/components/guide/PlaceEntries";
import { StayPicks } from "@/app/components/guide/StayPicks";
import { CtaPanel } from "@/app/components/sell/CtaPanel";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { GalleryGrid } from "@/app/components/ui/Lightbox";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";

const SITE = "https://arctrips.com";

/** How many other guides the foot of the page offers before it stops. */
const ONWARD_MAX = 6;

type Block = { type: string; text?: string };

function leadIndex(intro: Block[]): number {
  return intro.findIndex((b) => b.type === "p" && b.text);
}

export function lead(intro: Block[]): string | undefined {
  const i = leadIndex(intro);
  if (i === -1) return undefined;
  const p = cleanText(intro[i].text);
  if (!p) return undefined;
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
 * The guide: the long-form surface, up to 338 blocks and 9,000 words.
 *
 * One centred 760px column all the way down, with the text measure equal to
 * the column so nothing floats left inside it. There is deliberately no
 * in-page index and no sticky sidebar: both were built and rejected, because
 * on a reading surface they push the column off centre and compete with the
 * photography.
 *
 * Reading order: banner, when to go on the three tier scale, the article, the
 * documented places as editorial entries with their photograph at the full
 * width of the column, the gallery, the questions, the booking path, and
 * three stays picked by price band.
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

  const base = geoPath(trail);
  const month = new Date().getMonth() + 1;
  const bestMonths = monthsFor(categorySlug);
  const standfirst = lead(guide.intro);
  const heroPublicId = guide.heroPublicId ?? guide.photos[0]?.publicId;
  const selfUrl = `${SITE}${base}/things-to-do/${categorySlug}`;

  const onward = siblings
    .filter((g) => g.categorySlug !== categorySlug)
    .sort(
      (a, b) => rankForMonth(monthsFor(a.categorySlug), month) - rankForMonth(monthsFor(b.categorySlug), month),
    )
    .slice(0, ONWARD_MAX);

  // Only the frame a place already shows inline is held back. Its other
  // photographs still reach the gallery, so the guide keeps one, rather than
  // the gallery emptying itself the moment every photo is place-tagged.
  const shownInline = new Set(
    guide.places
      .map((p) => p.heroPublicId ?? guide.photos.find((ph) => ph.placeSlug === p.slug)?.publicId)
      .filter((id): id is string => Boolean(id)),
  );
  const gallery = guide.photos
    .filter((p) => !shownInline.has(p.publicId) && p.publicId !== heroPublicId)
    .map((p) => ({ publicId: p.publicId, caption: p.caption }));

  const stayFrom = listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined;

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

      <div className="dx">
        <div className="container">
          <Breadcrumb
            trail={[
              { href: "/destinations", label: "Destinations" },
              ...trail.slice(0, -1).map((n, i) => ({
                href: geoPath(trail.slice(0, i + 1)),
                label: n.name,
              })),
              { href: base, label: guide.cityName },
              { label: guide.categoryName },
            ]}
          />
        </div>

        <header className="hero">
          <div className="container">
            <div className="hero__b hero__b--sm">
              {heroPublicId && (
                <span className="hero__img">
                  <Image
                    src={cld(heroPublicId, { w: 1800, h: 620, fit: "fill" })}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    style={{ objectFit: "cover" }}
                  />
                </span>
              )}
              <div className="hero__t">
                <span className="hero__pill">{guide.cityName}</span>
                <h1>{guide.categoryName} in {guide.cityName}</h1>
                {standfirst && <p>{standfirst}</p>}
              </div>
            </div>
          </div>
        </header>

        {/* When to go, first, because it is the question that brought the
            reader here. Three tiers, never two. */}
        <section className="sec">
          <div className="container">
            <div className="panel panel--azure center">
              <div className="sechead center" style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: "1.35rem" }}>When to go.</h2>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <SeasonStrip
                  months={bestMonths}
                  label={`${guide.categoryName.toLowerCase()} in ${guide.cityName}`}
                  month={month}
                />
              </div>
              <SeasonLegend note={`Right now, ${TIER_WORD[tierForMonth(bestMonths, month)].toLowerCase()}.`} />
            </div>
          </div>
        </section>

        <section className="sec sec--flush">
          <div className="container">
            <div className="col">
              <GuideBody blocks={bodyBlocks(guide.intro)} photos={guide.photos} />
            </div>
          </div>
        </section>

        {guide.places.length > 0 && (
          <section className="sec sec--flush" id="places" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <div className="sechead center">
                <h2>{guide.places.length} places, documented.</h2>
                <p className="sub">
                  Every one visited. Names, what they suit, and what to know before you go.
                </p>
              </div>
              <PlaceEntries
                places={guide.places}
                photos={guide.photos}
                categoryName={guide.categoryName}
              />
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="sec sec--flush" id="gallery">
            <div className="container">
              <div className="sechead center">
                <h2>From the guide.</h2>
                <p className="sub">Photographs taken on the trips these pages came out of.</p>
              </div>
              <GalleryGrid photos={gallery} />
            </div>
          </section>
        )}

        {guide.faqs.length > 0 && (
          <section className="sec sec--flush" id="faq" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <div className="sechead center">
                <h2>Common questions.</h2>
              </div>
              <div className="col">
                <FaqList faqs={guide.faqs} />
              </div>
            </div>
          </section>
        )}

        {guide.related.length > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="sechead center">
                <span className="eyebrow">Related reading</span>
                <h2>More on {guide.categoryName.toLowerCase()}.</h2>
              </div>
              <div className="col">
                <div className="idx">
                  {guide.related.map((a) => (
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
        )}

        <section className="sec sec--flush">
          <div className="container">
            <CtaPanel
              cta={guide.cta}
              experiences={guide.experiences}
              citySlug={citySlug}
              cityName={guide.cityName}
              stayHref={`${base}#stays`}
              stayCount={listings.length}
              stayFrom={stayFrom}
            />
          </div>
        </section>

        {listings.length > 0 && (
          <section className="sec sec--flush" id="stays" style={{ scrollMarginTop: 88 }}>
            <div className="container">
              <StayPicks
                listings={listings}
                cityName={guide.cityName}
                stayCount={listings.length}
                seeAllHref={`${base}#stays`}
              />
            </div>
          </section>
        )}

        {onward.length > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="panel panel--grey">
                <div className="sechead center">
                  <span className="eyebrow">Keep going</span>
                  <h2>The rest of the year in {guide.cityName}.</h2>
                  <p className="sub">
                    Every other guide in this destination, and what this month is for each one.
                  </p>
                </div>
                <div className="catrow" style={{ marginBottom: 0 }}>
                  {onward.map((g) => {
                    const tier = tierForMonth(monthsFor(g.categorySlug), month);
                    return (
                      <Link
                        className="cat"
                        key={g.categorySlug}
                        href={`${base}/things-to-do/${g.categorySlug}`}
                      >
                        <span className="cat__n">{g.name}</span>
                        <span className="cat__c">{TIER_WORD[tier]}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
