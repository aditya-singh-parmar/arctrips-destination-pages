import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArticleBySlug, getAllArticleSlugs } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { FaqList } from "@/app/components/browse/FaqList";

/**
 * Standalone articles: the planning pieces and cross-cutting reads that are
 * not a thing to do (Pacific Rim Whale Festival, Best Time to Stay, Tofino
 * and Ucluelet Campgrounds). They live at the top level rather than under a
 * city because several of them span both towns, so `/tofino/...` would be
 * only half true. Things to do stay at `/[city]/[category]`.
 */
export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

function lead(body: { type: string; text?: string }[]): string | undefined {
  const p = body.find((b) => b.type === "p" && b.text)?.text;
  if (!p) return undefined;
  return p.length > 220 ? `${p.slice(0, 217)}...` : p;
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

  const body = article.body ?? [];
  // The lead is promoted into the hero, so it must not open the body too.
  const leadIndex = body.findIndex((b) => b.type === "p" && b.text);
  const rest = leadIndex === -1 ? body : body.filter((_, i) => i !== leadIndex);
  const standfirst = article.excerpt || lead(body);

  return (
    <>
      <TopNav active="destinations" />
      <div className="container">
        <Breadcrumb trail={[{ href: "/destinations", label: "Destinations" }, { label: article.title }]} />

        <div className="chero chero--sm">
          {article.heroPublicId && (
            <div className="chero__media">
              <Image src={cld(article.heroPublicId, { w: 1600, fit: "limit" })} alt={article.title} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
            </div>
          )}
          <div className="chero__scrim" aria-hidden="true" />
          <div className="chero__text">
            <h1 className="t-h1">{article.title}</h1>
            {standfirst && <p className="chero__sub" style={{ maxWidth: "56ch" }}>{standfirst}</p>}
          </div>
        </div>

        <article style={{ maxWidth: 720, margin: "0 auto" }}>
          <ArticleBlocks blocks={rest} />
          {(article.faqs?.length ?? 0) > 0 && <FaqList faqs={article.faqs ?? []} />}
        </article>
      </div>
      <Footer />
    </>
  );
}
