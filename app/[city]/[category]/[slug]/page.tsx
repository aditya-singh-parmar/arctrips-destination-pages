import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getCity,
  getCityCategories,
  getPlace,
  getPlaces,
  getPhotos,
  getExperiences,
  getArticlesForCity,
  getDestinations,
  getRegions,
  type City,
  type Place,
  type Article,
} from "@/app/lib/content";
import { resolveCta } from "@/app/lib/cta";
import { CATEGORY_BY_SLUG } from "@/app/lib/taxonomy";
import { cld } from "@/app/lib/cloudinary";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { PlaceCard } from "@/app/components/browse/PlaceCard";
import { CtaBlock } from "@/app/components/sell/CtaBlock";
import { FaqList } from "@/app/components/browse/FaqList";

const RESERVED_SLUGS = new Set(["things-to-do", "guides", "gallery"]);

export async function generateStaticParams() {
  const destinations = await getDestinations();
  const nested = await Promise.all(
    destinations.map(async (d) => {
      const categories = await getCityCategories(d.slug);
      const perCategory = await Promise.all(
        categories.map(async (c) => {
          const [places, articles] = await Promise.all([
            getPlaces(d.slug, c.categorySlug),
            getArticlesForCity(d.slug, c.categorySlug),
          ]);
          const placeParams = places.map((p) => ({ city: d.slug, category: c.categorySlug, slug: p.slug }));
          const articleParams = articles.map((a) => ({ city: d.slug, category: c.categorySlug, slug: a.slug }));
          return [...placeParams, ...articleParams];
        }),
      );
      return perCategory.flat();
    }),
  );
  return nested.flat();
}

function toc(blocks: { type: string; text?: string }[]) {
  return blocks
    .map((b, i) => ({ ...b, i }))
    .filter((b) => b.type === "h" && b.text);
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; category: string; slug: string }> }): Promise<Metadata> {
  const { city: citySlug, category: categorySlug, slug } = await params;
  if (RESERVED_SLUGS.has(categorySlug)) return { title: "Arc Trips" };
  const place = await getPlace(citySlug, categorySlug, slug);
  if (place) return { title: `${place.name} | Arc Trips`, description: place.blurb };
  const articles = await getArticlesForCity(citySlug, categorySlug);
  const article = articles.find((a) => a.slug === slug);
  return article ? { title: `${article.title} | Arc Trips`, description: article.excerpt } : { title: "Arc Trips" };
}

export default async function PlaceOrArticlePage({ params }: { params: Promise<{ city: string; category: string; slug: string }> }) {
  const { city: citySlug, category: categorySlug, slug } = await params;
  if (RESERVED_SLUGS.has(categorySlug)) notFound();

  const city = await getCity(citySlug);
  if (!city) notFound();
  const regions = await getRegions();
  const region = regions.find((r) => r.slug === city.regionSlug);
  const categoryName = CATEGORY_BY_SLUG.get(categorySlug)?.name ?? categorySlug;

  const place = await getPlace(citySlug, categorySlug, slug);
  if (place) return <PlacePage city={city} regionName={region?.name} categoryName={categoryName} place={place} />;

  const articles = await getArticlesForCity(citySlug, categorySlug);
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  return <ArticlePage city={city} regionName={region?.name} categoryName={categoryName} article={article} />;
}

async function PlacePage({
  city,
  regionName,
  categoryName,
  place,
}: {
  city: City;
  regionName?: string;
  categoryName: string;
  place: Place;
}) {
  const citySlug = city.slug;
  const categorySlug = place.categorySlug;

  const [experiences, photos, siblings] = await Promise.all([
    getExperiences(citySlug, { categorySlug, placeSlug: place.slug }),
    getPhotos(citySlug, { categorySlug, placeSlug: place.slug }),
    getPlaces(citySlug, categorySlug),
  ]);
  const cta = resolveCta({ citySlug, cityName: city.name, categorySlug, experiences });
  const headings = toc(place.body);
  const otherPlaces = siblings.filter((p) => p.slug !== place.slug);

  return (
    <>
      <Breadcrumb
        trail={[
          ...(regionName && city.regionSlug ? [{ href: `/destinations/${city.regionSlug}`, label: regionName }] : []),
          { href: `/${citySlug}`, label: city.name },
          { href: `/${citySlug}/${categorySlug}`, label: categoryName },
          { label: place.name },
        ]}
      />

      {place.heroPublicId && (
        <div className="chero chero--sm" style={{ marginTop: 12 }}>
          <div className="chero__media">
            <Image src={cld(place.heroPublicId, { w: 1600, fit: "limit" })} alt={place.name} fill sizes="100vw" style={{ objectFit: "cover" }} priority />
          </div>
          <div className="chero__scrim" aria-hidden="true" />
        </div>
      )}

      <div className="readlayout" style={{ marginTop: 20 }}>
        <article>
          <h1 className="t-h2" style={{ margin: "0 0 6px" }}>{place.name}</h1>
          {place.blurb && <p className="cityintro" style={{ marginTop: 0 }}>{place.blurb}</p>}

          <ArticleBlocks blocks={place.body} />

          {place.goodFor.length > 0 && (
            <div className="goodfor">
              {place.goodFor.map((g) => <span key={g}>{g}</span>)}
            </div>
          )}

          {place.goodToKnow && <p className="ar-note">{place.goodToKnow}</p>}

          <div style={{ marginTop: 28 }}>
            <h2 className="t-bold-20" style={{ marginBottom: 10 }}>Trips that run on {place.name}</h2>
            <CtaBlock cta={cta} citySlug={citySlug} />
          </div>

          {photos.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 className="t-bold-20" style={{ marginBottom: 10 }}>Photos of {place.name}</h2>
              <div className="area-gallery">
                {photos.map((p) => (
                  <Image key={p.id} src={cld(p.publicId, { w: 600, h: 450, fit: "fill" })} alt={p.caption ?? place.name} width={600} height={450} sizes="(max-width: 700px) 50vw, 33vw" />
                ))}
              </div>
            </div>
          )}

          {otherPlaces.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 className="t-bold-20" style={{ marginBottom: 10 }}>More {categoryName.toLowerCase()} in {city.name}</h2>
              <div className="pcardgrid">
                {otherPlaces.slice(0, 6).map((p) => (
                  <PlaceCard key={p.id} place={p} experienceCount={0} />
                ))}
              </div>
            </div>
          )}
        </article>

        {headings.length > 0 && (
          <aside className="toc">
            <p className="toc__label">On this page</p>
            <div className="toc__list">
              {headings.map((h) => <a key={h.i} href={`#h-${h.i}`}>{h.text}</a>)}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

async function ArticlePage({
  city,
  regionName,
  categoryName,
  article,
}: {
  city: City;
  regionName?: string;
  categoryName: string;
  article: Article;
}) {
  const citySlug = city.slug;
  const categorySlug = article.categorySlug ?? "";
  const experiences = categorySlug ? await getExperiences(citySlug, { categorySlug }) : [];
  const cta = categorySlug ? resolveCta({ citySlug, cityName: city.name, categorySlug, experiences }) : null;
  const headings = toc(article.body ?? []);

  return (
    <>
      <Breadcrumb
        trail={[
          ...(regionName && city.regionSlug ? [{ href: `/destinations/${city.regionSlug}`, label: regionName }] : []),
          { href: `/${citySlug}`, label: city.name },
          ...(categorySlug ? [{ href: `/${citySlug}/${categorySlug}`, label: categoryName }] : []),
          { label: article.title },
        ]}
      />

      <div className="readlayout" style={{ marginTop: 20 }}>
        <article>
          <h1 className="t-h2" style={{ margin: "0 0 6px" }}>{article.title}</h1>
          {article.excerpt && <p className="cityintro" style={{ marginTop: 0 }}>{article.excerpt}</p>}

          {article.body && article.body.length > 0 && <ArticleBlocks blocks={article.body} />}

          {article.faqs && article.faqs.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 className="t-bold-20" style={{ marginBottom: 10 }}>Frequently asked questions</h2>
              <FaqList faqs={article.faqs} />
            </div>
          )}

          {cta && (
            <div style={{ marginTop: 28 }}>
              <h2 className="t-bold-20" style={{ marginBottom: 10 }}>Trips that run in {categoryName.toLowerCase()}</h2>
              <CtaBlock cta={cta} citySlug={citySlug} />
            </div>
          )}
        </article>

        {headings.length > 0 && (
          <aside className="toc">
            <p className="toc__label">On this page</p>
            <div className="toc__list">
              {headings.map((h) => <a key={h.i} href={`#h-${h.i}`}>{h.text}</a>)}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
