import Link from "next/link";
import Image from "next/image";
import type { City, CityCategory } from "@/app/lib/content";
import { getPlaces, getPhotos, getExperiences, getArticlesForCity } from "@/app/lib/content";
import { resolveCta } from "@/app/lib/cta";
import { CATEGORY_BY_SLUG } from "@/app/lib/taxonomy";
import { cld, placeholder } from "@/app/lib/cloudinary";
import { CategoryCard } from "./CategoryCard";

export type CategoryIndexMode = "things-to-do" | "guides" | "gallery";

/**
 * Shared body for the three category-index pages (Task 10): same city,
 * same category set, different framing per `mode`. One component, three
 * thin page.tsx wrappers, so `/things-to-do`, `/guides`, `/gallery` never
 * drift into three copies of the same grid.
 */
export async function CategoryIndex({ city, categories, mode }: { city: City; categories: CityCategory[]; mode: CategoryIndexMode }) {
  if (mode === "things-to-do") return <ThingsToDoIndex city={city} categories={categories} />;
  if (mode === "gallery") return <GalleryIndex city={city} categories={categories} />;
  return <GuidesIndex city={city} />;
}

async function ThingsToDoIndex({ city, categories }: { city: City; categories: CityCategory[] }) {
  const stats = await Promise.all(
    categories.map(async (c) => {
      const [places, experiences] = await Promise.all([
        getPlaces(city.slug, c.categorySlug),
        getExperiences(city.slug, { categorySlug: c.categorySlug }),
      ]);
      const cta = resolveCta({ citySlug: city.slug, cityName: city.name, categorySlug: c.categorySlug, experiences });
      const state: "live" | "sister" | "soon" | "open" = cta.notify
        ? "soon"
        : cta.primary.kind === "sister-brand"
          ? "sister"
          : cta.primary.kind === "tours" && cta.primary.experiences.length > 0
            ? "live"
            : "open";
      const priceCandidates = cta.primary.experiences.map((e) => e.priceFrom).filter((n): n is number => n !== undefined);
      return {
        categorySlug: c.categorySlug,
        name: CATEGORY_BY_SLUG.get(c.categorySlug)?.name ?? c.categorySlug,
        heroPublicId: c.heroPublicId,
        placeCount: places.length,
        bookableCount: cta.primary.experiences.length,
        state,
        priceFrom: priceCandidates.length ? Math.min(...priceCandidates) : undefined,
      };
    }),
  );

  return (
    <>
      <h1 className="t-h2" style={{ margin: "16px 0 4px" }}>Things to do in {city.name}</h1>
      <p className="cityintro">{categories.length} categories to explore, from the water to the table.</p>
      <div className="pcardgrid">
        {stats.map((s) => (
          <CategoryCard
            key={s.categorySlug}
            category={{ slug: s.categorySlug, name: s.name, blurb: s.placeCount ? `${s.placeCount} places` : undefined, heroPublicId: s.heroPublicId }}
            citySlug={city.slug}
            bookableCount={s.bookableCount}
            state={s.state}
            priceFrom={s.priceFrom}
          />
        ))}
      </div>
    </>
  );
}

async function GuidesIndex({ city }: { city: City }) {
  const articles = (await getArticlesForCity(city.slug)).filter((a) => (a.body?.length ?? 0) > 0);
  return (
    <>
      <h1 className="t-h2" style={{ margin: "16px 0 4px" }}>Guides to {city.name}</h1>
      <p className="cityintro">{articles.length} guides, written by people who go there.</p>
      <div className="pcardgrid">
        {articles.map((a) => (
          <Link key={a.slug} href={`/${city.slug}/${a.categorySlug ?? "guides"}/${a.slug}`} className="pcard">
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
          </Link>
        ))}
      </div>
    </>
  );
}

async function GalleryIndex({ city, categories }: { city: City; categories: CityCategory[] }) {
  const counts = await Promise.all(
    categories.map(async (c) => ({
      categorySlug: c.categorySlug,
      name: CATEGORY_BY_SLUG.get(c.categorySlug)?.name ?? c.categorySlug,
      heroPublicId: c.heroPublicId,
      photoCount: (await getPhotos(city.slug, { categorySlug: c.categorySlug })).length,
    })),
  );

  return (
    <>
      <h1 className="t-h2" style={{ margin: "16px 0 4px" }}>{city.name} photos</h1>
      <p className="cityintro">Browse by category to see photos of the places behind each one.</p>
      <div className="pcardgrid">
        {counts.map((c) => (
          <Link key={c.categorySlug} href={`/${city.slug}/${c.categorySlug}`} className="pcard">
            <div className="pcard__media">
              <Image
                src={c.heroPublicId ? cld(c.heroPublicId, { w: 380, h: 260, fit: "fill" }) : placeholder(380, 260)}
                alt={c.name}
                width={380}
                height={260}
                sizes="172px"
              />
            </div>
            <h4 className="pcard__title">{c.name}</h4>
            <p className="pcard__meta">{c.photoCount} photos</p>
          </Link>
        ))}
      </div>
    </>
  );
}
