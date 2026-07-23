import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cld } from "@/app/lib/cloudinary";
import { getAllAreaSlugs, getArticles, getArticle, getAreaPage } from "@/app/lib/content";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { ArticleBody } from "@/app/components/area/ArticleBody";
import { IconArrow } from "@/app/components/ui/Icons";

export async function generateStaticParams() {
  const slugs = await getAllAreaSlugs();
  const nested = await Promise.all(
    slugs.map(async (slug) => (await getArticles(slug)).map((a) => ({ slug, guide: a.slug }))),
  );
  return nested.flat();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; guide: string }> }): Promise<Metadata> {
  const { slug, guide } = await params;
  const article = await getArticle(slug, guide);
  return article ? { title: `${article.title} | Arc Trips`, description: article.excerpt } : { title: "Arc Trips" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string; guide: string }> }) {
  const { slug, guide } = await params;
  const [article, area, articles] = await Promise.all([getArticle(slug, guide), getAreaPage(slug), getArticles(slug)]);
  if (!article) notFound();
  const hasBody = Boolean(article.body && article.body.length);

  return (
    <>
      <TopNav active="destinations" />
      <div className="container section">
        <div className="guide-layout">
          <aside className="guide-side">
            <Link className="gs-back" href={`/destinations/${slug}#guides`}>
              <span className="gs-back__icon"><IconArrow width={16} height={16} style={{ transform: "rotate(180deg)" }} /></span>
              All {area?.name ?? "destination"} guides
            </Link>
            <p className="gs-label">In this destination</p>
            <div className="gs-list">
              {articles.map((a) => (
                <Link key={a.slug} className="gs-item" href={`/destinations/${slug}/guides/${a.slug}`} data-active={a.slug === guide}>
                  <span className="gs-item__cat">{a.category}</span>
                  <span className="gs-item__title">{a.title}</span>
                </Link>
              ))}
            </div>
          </aside>

          <article className="ar">
            <header className="ar-head">
              <span className="ar-chip">{article.category}</span>
              <h1 className="ar-title">{article.title}</h1>
              {article.excerpt ? <p className="ar-standfirst">{article.excerpt}</p> : null}
              <div className="ar-meta">
                <span>{area?.name}</span>
                <span className="ar-meta__dot" aria-hidden="true" />
                <span>Arc Trips guide</span>
              </div>
            </header>

            <div className="ar-hero">
              <Image src={cld(article.heroPublicId, { w: 1600, fit: "limit" })} alt={article.title} width={1600} height={900} priority sizes="(max-width: 900px) 100vw, 720px" />
            </div>

            {hasBody ? (
              <ArticleBody blocks={article.body!} />
            ) : (
              <div className="ar-body">
                <p className="ar-lead">{article.excerpt}</p>
                <div className="ar-note">Detailed notes, maps, and local tips for this guide are being added by the Arc Trips team.</div>
              </div>
            )}
          </article>
        </div>
      </div>
      <Footer />
    </>
  );
}
