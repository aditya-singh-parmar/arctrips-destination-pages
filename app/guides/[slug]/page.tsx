import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug, getAllArticleSlugs } from "@/app/lib/content";
import { GuideDetail, lead } from "@/app/components/templates/GuideDetail";

/**
 * Standalone articles at their pre-tree URL. Kept alive because these links
 * shipped before /travel-guides existed; the same content also renders under
 * the deep tree, which is the canonical home. Rendering comes from one
 * component so the two routes cannot drift apart.
 */
export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Arc Trips" };
  return { title: `${article.title} | Arc Trips`, description: article.excerpt || lead(article.body ?? []) };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  return <GuideDetail article={article} />;
}
