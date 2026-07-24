import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCity,
  getCityCategories,
  getCityCategory,
  getPlaces,
  getExperiences,
  getArticlesForCity,
  getDestinations,
  getRegions,
} from "@/app/lib/content";
import { resolveCta } from "@/app/lib/cta";
import { CATEGORY_BY_SLUG } from "@/app/lib/taxonomy";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ChipRow, type Chip } from "@/app/components/browse/ChipRow";
import { PlaceCard } from "@/app/components/browse/PlaceCard";
import { CtaBlock } from "@/app/components/sell/CtaBlock";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { Rail } from "@/app/components/browse/Rail";
import { cld, placeholder } from "@/app/lib/cloudinary";
import Image from "next/image";
import Link from "next/link";

/** These three are real routes elsewhere; a stray link to one of them must
    never fall through to the dynamic `[category]` handler and render an
    empty/wrong category page. */
const RESERVED_SLUGS = new Set(["things-to-do", "guides", "gallery"]);

export async function generateStaticParams() {
  const destinations = await getDestinations();
  const nested = await Promise.all(
    destinations.map(async (d) => (await getCityCategories(d.slug)).map((c) => ({ city: d.slug, category: c.categorySlug }))),
  );
  return nested.flat();
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; category: string }> }): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  if (RESERVED_SLUGS.has(categorySlug)) return { title: "Arc Trips" };
  const [city, cityCategory] = await Promise.all([getCity(citySlug), getCityCategory(citySlug, categorySlug)]);
  const categoryName = CATEGORY_BY_SLUG.get(categorySlug)?.name ?? categorySlug;
  return city && cityCategory ? { title: `${categoryName} in ${city.name} | Arc Trips` } : { title: "Arc Trips" };
}

export default async function CategoryPage({ params }: { params: Promise<{ city: string; category: string }> }) {
  const { city: citySlug, category: categorySlug } = await params;
  if (RESERVED_SLUGS.has(categorySlug)) notFound();

  const [city, cityCategory, categories] = await Promise.all([
    getCity(citySlug),
    getCityCategory(citySlug, categorySlug),
    getCityCategories(citySlug),
  ]);
  if (!city || !cityCategory) notFound();

  const regions = await getRegions();
  const region = regions.find((r) => r.slug === city.regionSlug);
  const category = CATEGORY_BY_SLUG.get(categorySlug);
  const categoryName = category?.name ?? categorySlug;

  const [places, experiences, articles] = await Promise.all([
    getPlaces(citySlug, categorySlug),
    getExperiences(citySlug, { categorySlug }),
    getArticlesForCity(citySlug, categorySlug),
  ]);

  const cta = resolveCta({ citySlug, cityName: city.name, categorySlug, experiences });
  const guideArticles = articles.filter((a) => (a.body?.length ?? 0) > 0);

  const categoryChips: Chip[] = categories.map((c) => ({
    label: CATEGORY_BY_SLUG.get(c.categorySlug)?.name ?? c.categorySlug,
    href: `/${citySlug}/${c.categorySlug}`,
    active: c.categorySlug === categorySlug,
  }));

  // Decorative facet chips: "good for" tags that recur across more than one
  // place in this category. Not a real filter yet (no query-string wiring
  // in v1.1), pure wayfinding, matching the mockup's illustrative facets.
  const facetCounts = new Map<string, number>();
  for (const p of places) for (const g of p.goodFor) facetCounts.set(g, (facetCounts.get(g) ?? 0) + 1);
  const facets = Array.from(facetCounts.entries())
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);
  const facetChips: Chip[] = [
    { label: `All ${places.length}`, active: true },
    ...facets.map((label) => ({ label })),
  ];

  return (
    <>
      <Breadcrumb
        trail={[
          ...(region ? [{ href: `/destinations/${region.slug}`, label: region.name }] : []),
          { href: `/${citySlug}`, label: city.name },
          { label: categoryName },
        ]}
      />

      <ChipRow items={categoryChips} />

      <h1 className="t-h2" style={{ margin: "6px 0 5px" }}>
        {cityCategory.intro.find((b) => b.type === "h")?.text ?? `${categoryName} in ${city.name}`}
      </h1>
      {cityCategory.intro.filter((b) => b.type !== "h").length > 0 ? (
        <ArticleBlocks blocks={cityCategory.intro.filter((b) => b.type !== "h")} />
      ) : null}

      {places.length > 0 && <ChipRow items={facetChips} />}

      {places.length > 0 ? (
        <div className="pcardgrid">
          {places.map((p) => {
            const placeExperiences = experiences.filter((e) => e.placeSlug === p.slug);
            const priceCandidates = placeExperiences.map((e) => e.priceFrom).filter((n): n is number => n !== undefined);
            return (
              <PlaceCard
                key={p.id}
                place={p}
                experienceCount={placeExperiences.length}
                priceFrom={priceCandidates.length ? Math.min(...priceCandidates) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <p className="cityintro">No individual places are mapped for {categoryName.toLowerCase()} yet, but you can still book the experiences below.</p>
      )}

      <div style={{ marginTop: 24 }}>
        <CtaBlock cta={cta} citySlug={citySlug} />
      </div>

      {guideArticles.length > 0 && (
        <Rail title={`Guides to ${categoryName.toLowerCase()}`} href={`/${citySlug}/guides`}>
          {guideArticles.map((a) => (
            <Link key={a.slug} href={`/${citySlug}/${categorySlug}/${a.slug}`} className="pcard">
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
        </Rail>
      )}
    </>
  );
}
