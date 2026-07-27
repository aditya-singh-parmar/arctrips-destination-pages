import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDestinationPath } from "@/app/lib/resolver";
import { lookupGeoChild } from "@/app/lib/geo";
import { geoPath } from "@/app/lib/geo-types";
import { getCity, getGuide } from "@/app/lib/content";
import { DestinationsLanding } from "@/app/components/templates/DestinationsLanding";
import { DestinationHub } from "@/app/components/templates/DestinationHub";
import { CategoryGuide, lead } from "@/app/components/templates/CategoryGuide";
import { GeoIndex } from "@/app/components/templates/GeoIndex";
import { ThingsToDoIndex } from "@/app/components/templates/ThingsToDoIndex";
import { PlanIndex } from "@/app/components/templates/PlanIndex";

const SITE = "https://arctrips.com";

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The whole destination tree resolves here. Region is optional, so a town sits
 * at segment 3 or 4 and everything deeper shifts with it; a catch-all plus the
 * segment resolver is the only shape that expresses that.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.2.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ path = [] }, query] = await Promise.all([params, searchParams]);
  const r = await resolveDestinationPath(path, lookupGeoChild);

  if (r.kind === "landing") {
    return {
      title: "Destinations | Arc Trips",
      description:
        "The places we know properly: where to stay, what to do, and local guides written by people who go there.",
      alternates: { canonical: `${SITE}/destinations` },
    };
  }

  if (r.kind === "geo") {
    return {
      title: r.node.seoTitle ?? `${r.node.name} | Arc Trips`,
      description: r.node.seoDescription ?? r.node.standfirst,
      alternates: { canonical: `${SITE}${geoPath(r.trail)}` },
    };
  }

  if (r.kind === "things-to-do") {
    const city = await getCity(r.town.slug);
    return {
      title: `Things to do in ${city?.name ?? r.town.name} | Arc Trips`,
      alternates: { canonical: `${SITE}${geoPath(r.trail)}/things-to-do` },
    };
  }

  if (r.kind === "plan") {
    const city = await getCity(r.town.slug);
    const canonical = `${SITE}${geoPath(r.trail)}/plan`;
    // Faceted views carry noindex,follow and canonical to the unfaceted
    // parent. This is what stops a folder explosion at scale (AC 33).
    const faceted = Object.keys(query).length > 0;
    return {
      title: `Plan your trip to ${city?.name ?? r.town.name} | Arc Trips`,
      alternates: { canonical },
      ...(faceted ? { robots: { index: false, follow: true } } : {}),
    };
  }

  if (r.kind === "category") {
    const guide = await getGuide(r.town.slug, r.categorySlug);
    if (!guide) return { title: "Arc Trips" };
    return {
      // Informational intent, distinct from the transactional section town
      // page. Both are self-canonical and neither canonicals to the other.
      title: `${guide.categoryName} in ${guide.cityName}, Best Time, Where to Go | Arc Trips`,
      description: lead(guide.intro),
      alternates: { canonical: `${SITE}${geoPath(r.trail)}/things-to-do/${r.categorySlug}` },
    };
  }

  return { title: "Arc Trips" };
}

export default async function DestinationsRoute({ params, searchParams }: Props) {
  const [{ path = [] }, query] = await Promise.all([params, searchParams]);
  const resolution = await resolveDestinationPath(path, lookupGeoChild);

  switch (resolution.kind) {
    case "landing":
      return <DestinationsLanding />;

    case "geo":
      if (resolution.node.type === "town") {
        return <DestinationHub citySlug={resolution.node.slug} trail={resolution.trail} />;
      }
      if (resolution.node.type === "area") notFound(); // Area template lands next.
      return <GeoIndex node={resolution.node} trail={resolution.trail} />;

    case "things-to-do":
      return <ThingsToDoIndex town={resolution.town} trail={resolution.trail} />;

    case "plan": {
      const forParam = query.for;
      return (
        <PlanIndex
          town={resolution.town}
          trail={resolution.trail}
          profile={Array.isArray(forParam) ? forParam[0] : forParam}
        />
      );
    }

    case "category":
      return (
        <CategoryGuide
          citySlug={resolution.town.slug}
          categorySlug={resolution.categorySlug}
          trail={resolution.trail}
        />
      );

    // The comparison template moves to Plan 3, alongside the import that
    // produces the one comparison document in the corpus.
    default:
      notFound();
  }
}
