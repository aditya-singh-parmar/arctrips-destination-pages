import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveGuidePath } from "@/app/lib/resolver";
import { lookupGeoChild } from "@/app/lib/geo";
import { guidePath } from "@/app/lib/geo-types";
import { getArticleBySlug } from "@/app/lib/content";
import { GuideDetail, lead } from "@/app/components/templates/GuideDetail";

const SITE = "https://arctrips.com";

type Props = { params: Promise<{ path?: string[] }> };

/**
 * The travel-guide tree. The location path may terminate at province, region
 * or town, which is what gives the regional roundups ("Best Beaches on
 * Vancouver Island", "Top 20 Ski Mountains in BC") a legal URL.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.3.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const r = await resolveGuidePath(path, lookupGeoChild);
  if (r.kind !== "guide") return { title: "Travel guides | Arc Trips" };

  const article = await getArticleBySlug(r.slug);
  if (!article) return { title: "Travel guides | Arc Trips" };
  return {
    title: `${article.title} | Arc Trips`,
    description: article.excerpt || lead(article.body ?? []),
    alternates: { canonical: `${SITE}${guidePath(r.trail, r.slug)}` },
  };
}

export default async function TravelGuidesRoute({ params }: Props) {
  const { path = [] } = await params;
  const resolution = await resolveGuidePath(path, lookupGeoChild);

  if (resolution.kind === "guide") {
    const article = await getArticleBySlug(resolution.slug);
    if (!article) notFound();
    return <GuideDetail article={article} trail={resolution.trail} />;
  }

  // Scope index templates land in Plan 2.
  notFound();
}
