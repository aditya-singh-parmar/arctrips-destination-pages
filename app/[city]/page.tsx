import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCity,
  getCityCategories,
  getPlaces,
  getPhotos,
  getExperiences,
  getListings,
  getArticlesForCity,
  getDestinations,
  getRegions,
} from "@/app/lib/content";
import { resolveCta } from "@/app/lib/cta";
import { CATEGORY_BY_SLUG, THEMES, THEME_GRID_THRESHOLD, PRODUCT_LINES } from "@/app/lib/taxonomy";
import { cld } from "@/app/lib/cloudinary";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { Rail } from "@/app/components/browse/Rail";
import { ChipRow, type Chip } from "@/app/components/browse/ChipRow";
import { CategoryCard } from "@/app/components/browse/CategoryCard";
import { ThemeGrid, type ThemeGridGroup } from "@/app/components/browse/ThemeGrid";
import { FaqList } from "@/app/components/browse/FaqList";
import { SellTile } from "@/app/components/sell/SellTile";
import { ListingCard } from "@/app/components/landing/ListingCard";

export async function generateStaticParams() {
  const destinations = await getDestinations();
  const checked = await Promise.all(
    destinations.map(async (d) => ((await getCityCategories(d.slug)).length > 0 ? d.slug : null)),
  );
  return checked.filter((s): s is string => Boolean(s)).map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  return city ? { title: `${city.name} | Arc Trips`, description: city.standfirst } : { title: "Arc Trips" };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city) notFound();
  const categories = await getCityCategories(citySlug);

  const [photos, listings, cityExperiences, articles, regions] = await Promise.all([
    getPhotos(citySlug),
    getListings({ destinationSlug: citySlug }),
    getExperiences(citySlug),
    getArticlesForCity(citySlug),
    getRegions(),
  ]);
  const region = regions.find((r) => r.slug === city.regionSlug);

  const liveSlugs = new Set(PRODUCT_LINES.filter((p) => p.status === "live").map((p) => p.slug));
  const tripsToBook = cityExperiences.filter((e) => liveSlugs.has(e.productLineSlug)).length;

  // One resolveCta (+ places/experiences read) per category, reused for the
  // things-to-do rail cards and to pick the sell tile below.
  const categoryStats = await Promise.all(
    categories.map(async (c) => {
      const [places, experiences] = await Promise.all([
        getPlaces(citySlug, c.categorySlug),
        getExperiences(citySlug, { categorySlug: c.categorySlug }),
      ]);
      const cta = resolveCta({ citySlug, cityName: city.name, categorySlug: c.categorySlug, experiences });
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
        cta,
      };
    }),
  );

  const sellPick = categoryStats.find((s) => s.state === "sister" || s.state === "live");
  const sellProductLine = sellPick ? PRODUCT_LINES.find((p) => p.slug === sellPick.cta.primary.productLineSlug) : undefined;

  const themeSlugs = Array.from(
    new Set(categories.map((c) => CATEGORY_BY_SLUG.get(c.categorySlug)?.theme).filter((t): t is (typeof THEMES)[number]["slug"] => Boolean(t))),
  );
  const essentialChips: Chip[] = [
    { label: "Essentials", href: `/${citySlug}/things-to-do`, active: true },
    ...themeSlugs.map((slug) => ({ label: THEMES.find((t) => t.slug === slug)?.name ?? slug, href: `/${citySlug}/things-to-do` })),
  ];

  const guideArticles = articles.filter((a) => (a.body?.length ?? 0) > 0);
  const faqs = articles.flatMap((a) => a.faqs ?? []).slice(0, 6);

  const showThemeGrid = categories.length > THEME_GRID_THRESHOLD;
  const themeGroups: ThemeGridGroup[] = themeSlugs.map((slug) => {
    const theme = THEMES.find((t) => t.slug === slug);
    const inTheme = categoryStats.filter((s) => CATEGORY_BY_SLUG.get(s.categorySlug)?.theme === slug);
    return {
      title: theme?.name ?? slug,
      count: `${inTheme.length} categories`,
      items: inTheme.slice(0, 5).map((s) => s.name),
    };
  });

  return (
    <>
      <Breadcrumb
        trail={[
          ...(region ? [{ href: `/destinations/${region.slug}`, label: region.name }] : []),
          { label: city.name },
        ]}
      />

      <div className="chero">
        <div className="chero__media">
          <Image src={cld(city.heroPublicId, { w: 1600, fit: "limit" })} alt={city.name} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
        </div>
        <div className="chero__scrim" aria-hidden="true" />
        {photos.length > 0 && <span className="chero__count">{photos.length} photos</span>}
        <div className="chero__text">
          <h1 className="t-h1">{city.name}</h1>
          {region && <p className="chero__sub">{region.name}</p>}
        </div>
        <span className="chero__summary">{city.listingCount} stays &middot; {tripsToBook} trips to book</span>
      </div>

      <p className="cityintro">{city.overview[0]}</p>
      {city.overview.slice(1).map((p, i) => <p className="cityintro" key={i}>{p}</p>)}

      <div className="rail__head" style={{ marginTop: 24 }}>
        <div>
          <h2>Essential {city.name}</h2>
          <p>Start with what you are in the mood for</p>
        </div>
      </div>
      <ChipRow items={essentialChips} />

      <Rail
        title="Things to do"
        subtitle={`${categories.length} categories, ${tripsToBook} trips you can book`}
        href={`/${citySlug}/things-to-do`}
      >
        {categoryStats.map((s) => (
          <CategoryCard
            key={s.categorySlug}
            category={{ slug: s.categorySlug, name: s.name, blurb: s.placeCount ? `${s.placeCount} places` : undefined, heroPublicId: s.heroPublicId }}
            citySlug={citySlug}
            bookableCount={s.bookableCount}
            state={s.state}
            priceFrom={s.priceFrom}
          />
        ))}
      </Rail>

      {listings.length > 0 && (
        <div id="stays">
          <Rail title="Where to stay" subtitle={`${listings.length} cabins, cottages and lodges`} href={`/${citySlug}#stays`}>
            {listings.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} variant="holiday" />
            ))}
          </Rail>
        </div>
      )}

      {sellPick && sellProductLine && (
        <SellTile
          headline={`${sellPick.name} in ${city.name}`}
          blurb={sellProductLine.blurb}
          ctaLabel={sellPick.cta.primary.label}
          href={sellPick.cta.primary.href ?? `/${citySlug}/${sellPick.categorySlug}`}
          external={sellPick.cta.primary.external}
        />
      )}

      {guideArticles.length > 0 && (
        <Rail title={`Guides to ${city.name}`} subtitle="Written by people who go there" href={`/${citySlug}/guides`}>
          {guideArticles.map((a) => (
            <Link key={a.slug} href={`/${citySlug}/${a.categorySlug ?? "guides"}/${a.slug}`} className="pcard">
              <div className="pcard__media">
                <Image src={cld(a.heroPublicId, { w: 380, h: 260, fit: "fill" })} alt={a.title} width={380} height={260} sizes="172px" />
              </div>
              <h4 className="pcard__title">{a.title}</h4>
              {a.excerpt && <p className="pcard__meta">{a.excerpt}</p>}
            </Link>
          ))}
        </Rail>
      )}

      {showThemeGrid && themeGroups.length > 0 && (
        <>
          <div className="rail__head">
            <div><h2>{city.name} is great for</h2></div>
          </div>
          <ThemeGrid groups={themeGroups} />
        </>
      )}

      {faqs.length > 0 && (
        <>
          <div className="rail__head">
            <div><h2>{city.name} travel questions</h2></div>
          </div>
          <FaqList faqs={faqs} />
        </>
      )}
    </>
  );
}
