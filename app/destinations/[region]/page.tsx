import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegions, getDestinations, getCity, getArticlesForRegion } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";

export async function generateStaticParams() {
  const regions = await getRegions();
  return regions.map((r) => ({ region: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region: regionSlug } = await params;
  const region = (await getRegions()).find((r) => r.slug === regionSlug);
  return region ? { title: `${region.name} | Arc Trips`, description: region.blurb } : { title: "Arc Trips" };
}

/**
 * The region page holds cross-city corpus content (an article whose
 * `region_slug` is set and `city_slugs` is empty, e.g. "How to Choose a
 * Vacation Rental on Vancouver Island") plus a grid of that region's cities
 * at their real `/{city}` routes. There is no separate `/destinations/
 * {region}/{article}` route in the v1.1 URL map (spec section 3), so a
 * region-level article's body renders inline here rather than linking out.
 */
export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region: regionSlug } = await params;
  const region = (await getRegions()).find((r) => r.slug === regionSlug);
  if (!region) notFound();

  const destinations = await getDestinations();
  const cities = (await Promise.all(destinations.map((d) => getCity(d.slug)))).filter(
    (c): c is NonNullable<typeof c> => Boolean(c) && c!.regionSlug === region.slug,
  );
  const regionArticles = (await getArticlesForRegion(region.slug)).filter((a) => (a.body?.length ?? 0) > 0);

  return (
    <>
      <TopNav active="destinations" />
      <div className="container" style={{ paddingTop: 12 }}>
        <Breadcrumb trail={[{ href: "/destinations", label: "Destinations" }, { label: region.name }]} />
      </div>

      <section className="container" style={{ paddingTop: 8 }}>
        <div className="banner" style={{ minHeight: 240 }}>
          <Image src={cld(region.heroPublicId, { w: 2000, fit: "limit" })} alt="" width={2000} height={480} sizes="100vw" />
          <div className="banner__scrim" aria-hidden="true" />
          <div className="banner__content">
            <h1 className="t-h1" style={{ color: "#fff" }}>{region.name}</h1>
            {region.blurb && <p className="t-reg-16" style={{ color: "#F2F6FB", maxWidth: 620 }}>{region.blurb}</p>}
          </div>
        </div>
      </section>

      <section className="container section" style={{ paddingBottom: 8 }}>
        <h2 className="t-h2" style={{ marginBottom: 20 }}>Destinations in {region.name}</h2>
        <div className="dest-cards">
          {cities.map((c) => (
            <Link key={c.slug} className="dcard" href={`/${c.slug}`}>
              <Image src={cld(c.heroPublicId, { w: 640, h: 512, fit: "fill" })} alt={c.name} width={640} height={512} sizes="(max-width: 720px) 50vw, 25vw" />
              <div className="dcard__scrim" aria-hidden="true" />
              <div className="dcard__body">
                <p className="dcard__name t-bold-20">{c.name}</p>
                <p className="dcard__meta t-med-14">{c.listingCount ? `${c.listingCount} stays` : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {regionArticles.map((a) => (
        <section className="container section" key={a.slug}>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>{a.title}</h2>
          {a.excerpt && <p className="cityintro" style={{ marginTop: 0 }}>{a.excerpt}</p>}
          <ArticleBlocks blocks={a.body ?? []} />
        </section>
      ))}

      <Footer />
    </>
  );
}
