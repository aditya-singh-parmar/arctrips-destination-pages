import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getGuide, getGuidesForCity, getListings, getDestinations } from "@/app/lib/content";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { FaqList } from "@/app/components/browse/FaqList";
import { BookingRail } from "@/app/components/guide/BookingRail";

export async function generateStaticParams() {
  const destinations = await getDestinations();
  const nested = await Promise.all(
    destinations.map(async (d) => (await getGuidesForCity(d.slug)).map((g) => ({ city: d.slug, category: g.categorySlug }))),
  );
  return nested.flat();
}

function leadIndex(intro: { type: string; text?: string }[]): number {
  return intro.findIndex((b) => b.type === "p" && b.text);
}

function lead(intro: { type: string; text?: string }[]): string | undefined {
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
function bodyBlocks<T extends { type: string; text?: string }>(intro: T[]): T[] {
  const i = leadIndex(intro);
  return i === -1 ? intro : intro.filter((_, n) => n !== i);
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; category: string }> }): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  const guide = await getGuide(citySlug, categorySlug);
  if (!guide) return { title: "Arc Trips" };
  return {
    title: `${guide.categoryName} in ${guide.cityName} | Arc Trips`,
    description: lead(guide.intro),
  };
}

/**
 * S1 guide article (owner-approved 2026-07-24): the article body IS a
 * `city_categories.intro` row (real sizes, up to 338 blocks for birding).
 * Places render as sections within the guide, never separate pages
 * (`/tofino/beaches` renders its 13 beaches inline). Booking is a
 * persistent rail beside the article on desktop, stacking below on
 * mobile (`BookingRail`, driven entirely by `resolveCta`). See
 * design/structure/s1/whale-watching.html.
 */
export default async function GuidePage({ params }: { params: Promise<{ city: string; category: string }> }) {
  const { city: citySlug, category: categorySlug } = await params;
  const guide = await getGuide(citySlug, categorySlug);
  if (!guide) notFound();

  const listings = await getListings({ destinationSlug: citySlug });
  const stayFrom = listings.length ? Math.min(...listings.map((l) => l.pricePerNight)) : undefined;
  const standfirst = lead(guide.intro);

  return (
    <>
      <TopNav active="destinations" />
      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            { href: `/${citySlug}`, label: guide.cityName },
            { label: guide.categoryName },
          ]}
        />

        <div className="chero chero--sm">
          {guide.heroPublicId && (
            <div className="chero__media">
              <Image src={cld(guide.heroPublicId, { w: 1600, fit: "limit" })} alt={`${guide.categoryName} in ${guide.cityName}`} fill sizes="100vw" style={{ objectFit: "cover" }} priority />
            </div>
          )}
          <div className="chero__scrim" aria-hidden="true" />
          <div className="chero__text">
            <h1 className="t-h1">{guide.categoryName} in {guide.cityName}</h1>
            {standfirst && <p className="chero__sub" style={{ maxWidth: "56ch" }}>{standfirst}</p>}
          </div>
        </div>

        <div className="guidelayout">
          <article>
            <ArticleBlocks blocks={bodyBlocks(guide.intro)} />

            {guide.places.length > 0 && (
              <div className="guide-places">
                {guide.places.map((p) => (
                  <section className="guide-place" id={p.slug} key={p.id}>
                    <h2 className="ar-h2">{p.name}</h2>
                    {p.blurb && <p className="guide-place__blurb">{p.blurb}</p>}
                    <ArticleBlocks blocks={p.body} />
                    {p.goodFor.length > 0 && (
                      <div className="goodfor">
                        {p.goodFor.map((g) => <span key={g}>{g}</span>)}
                      </div>
                    )}
                    {p.goodToKnow && <p className="ar-note">{p.goodToKnow}</p>}
                  </section>
                ))}
              </div>
            )}

            {guide.faqs.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 className="t-bold-20" style={{ marginBottom: 10 }}>Common questions</h2>
                <FaqList faqs={guide.faqs} />
              </div>
            )}

            {guide.related.length > 0 && (
              <div style={{ borderTop: "1px solid var(--n-100)", marginTop: 40, paddingTop: 26 }}>
                <div className="rail__head">
                  <div><h2>{guide.categoryName} reading</h2></div>
                </div>
                <div className="pcardgrid">
                  {guide.related.map((a) => (
                    <div className="pcard" key={a.slug}>
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <BookingRail
            cta={guide.cta}
            experiences={guide.experiences}
            citySlug={citySlug}
            cityName={guide.cityName}
            stayCount={listings.length}
            stayFrom={stayFrom}
          />
        </div>
      </div>
      <Footer />
    </>
  );
}
