import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllAreaSlugs, getAreaPage, getArticles, getListings } from "@/app/lib/content";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { ListingCard } from "@/app/components/landing/ListingCard";
import { AreaHero } from "@/app/components/area/AreaHero";
import { SectionNav } from "@/app/components/area/SectionNav";
import { ThingsToDo } from "@/app/components/area/ThingsToDo";
import { GuidesGrid } from "@/app/components/area/GuidesGrid";
import { AreaGallery } from "@/app/components/area/AreaGallery";

export async function generateStaticParams() {
  const slugs = await getAllAreaSlugs();
  const pages = await Promise.all(slugs.map(async (s) => ((await getAreaPage(s)) ? s : null)));
  return pages.filter(Boolean).map((slug) => ({ slug: slug as string }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = await getAreaPage(slug);
  return area
    ? { title: `${area.name} | Arc Trips`, description: area.standfirst }
    : { title: "Arc Trips" };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = await getAreaPage(slug);
  if (!area) notFound();
  const [articles, stays] = await Promise.all([getArticles(slug), getListings({ destinationSlug: slug })]);

  return (
    <>
      <TopNav />
      <div className="container" style={{ paddingTop: 24 }}>
        <AreaHero name={area.name} region={area.region} standfirst={area.standfirst} heroPublicId={area.heroPublicId} />
      </div>

      <div className="container">
        <div className="area-layout">
          <SectionNav sections={area.sections} />

          <div>
            <section id="overview" className="area-section">
              <h2 className="t-h2">About {area.name}</h2>
              <div className="area-prose">
                {area.overview.map((p, i) => <p key={i} className="t-reg-16">{p}</p>)}
              </div>
            </section>

            {area.things.length > 0 && (
              <section id="things" className="area-section">
                <h2 className="t-h2">Things to do</h2>
                <ThingsToDo things={area.things} />
              </section>
            )}

            {articles.length > 0 && (
              <section id="guides" className="area-section">
                <h2 className="t-h2">Guides &amp; articles</h2>
                <p className="t-reg-16" style={{ color: "var(--n-600)", marginTop: -8, marginBottom: 16 }}>
                  Local guides to {area.name} and the things to do around it.
                </p>
                <GuidesGrid articles={articles} />
              </section>
            )}

            {stays.length > 0 && (
              <section id="stays" className="area-section">
                <h2 className="t-h2">Where to stay in {area.name}</h2>
                <div className="grid-3" style={{ marginTop: 16 }}>
                  {stays.map((l) => <ListingCard key={l.id} listing={l} />)}
                </div>
              </section>
            )}

            {area.galleryPublicIds.length > 0 && (
              <section id="gallery" className="area-section">
                <h2 className="t-h2">Gallery</h2>
                <AreaGallery publicIds={area.galleryPublicIds} />
              </section>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
