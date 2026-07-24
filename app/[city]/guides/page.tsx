import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCity, getCityCategories, getDestinations, getRegions } from "@/app/lib/content";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { CategoryIndex } from "@/app/components/browse/CategoryIndex";

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
  return city ? { title: `Guides to ${city.name} | Arc Trips` } : { title: "Arc Trips" };
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const [city, categories, regions] = await Promise.all([getCity(citySlug), getCityCategories(citySlug), getRegions()]);
  if (!city) notFound();
  const region = regions.find((r) => r.slug === city.regionSlug);

  return (
    <>
      <Breadcrumb
        trail={[
          ...(region ? [{ href: `/destinations/${region.slug}`, label: region.name }] : []),
          { href: `/${city.slug}`, label: city.name },
          { label: "Guides" },
        ]}
      />
      <CategoryIndex city={city} categories={categories} mode="guides" />
    </>
  );
}
