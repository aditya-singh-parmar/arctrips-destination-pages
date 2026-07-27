import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDestinationPath } from "@/app/lib/resolver";
import { lookupGeoChild } from "@/app/lib/geo";
import { geoPath } from "@/app/lib/geo-types";
import { getGuide } from "@/app/lib/content";
import { DestinationsLanding } from "@/app/components/templates/DestinationsLanding";
import { DestinationHub } from "@/app/components/templates/DestinationHub";
import { CategoryGuide, lead } from "@/app/components/templates/CategoryGuide";

const SITE = "https://arctrips.com";

type Props = { params: Promise<{ path?: string[] }> };

/**
 * The whole destination tree resolves here. Region is optional, so a town sits
 * at segment 3 or 4 and everything deeper shifts with it; a catch-all plus the
 * segment resolver is the only shape that expresses that.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.2.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
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

export default async function DestinationsRoute({ params }: Props) {
  const { path = [] } = await params;
  const resolution = await resolveDestinationPath(path, lookupGeoChild);

  switch (resolution.kind) {
    case "landing":
      return <DestinationsLanding />;

    case "geo":
      // Country, province and region index templates land in Plan 2. Until
      // then a town renders its hub and the higher tiers fall through to the
      // landing page, so no URL in the tree 500s or dead-ends.
      if (resolution.node.type === "town") {
        return <DestinationHub citySlug={resolution.node.slug} trail={resolution.trail} />;
      }
      if (resolution.node.type === "area") notFound();
      return <DestinationsLanding />;

    case "category":
      return (
        <CategoryGuide
          citySlug={resolution.town.slug}
          categorySlug={resolution.categorySlug}
          trail={resolution.trail}
        />
      );

    // things-to-do, plan and compare templates land in Plan 2.
    default:
      notFound();
  }
}
