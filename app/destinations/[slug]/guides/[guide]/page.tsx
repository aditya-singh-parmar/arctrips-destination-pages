import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cld } from "@/app/lib/cloudinary";
import { getAllAreaSlugs, getArticles, getArticle, getAreaPage } from "@/app/lib/content";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";

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
  return article ? { title: `${article.title} — Arc Trips`, description: article.excerpt } : { title: "Arc Trips" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string; guide: string }> }) {
  const { slug, guide } = await params;
  const [article, area] = await Promise.all([getArticle(slug, guide), getAreaPage(slug)]);
  if (!article) notFound();

  return (
    <>
      <TopNav />
      <div className="container section">
        <article className="article">
          <Link className="article__back" href={`/destinations/${slug}#guides`}>&larr; {area?.name ?? "Back"}</Link>
          <p className="article__cat t-med-12" style={{ marginTop: 16 }}>{article.category}</p>
          <h1 className="t-h1" style={{ margin: "8px 0 24px" }}>{article.title}</h1>
          <div className="article__hero">
            <Image src={cld(article.heroPublicId, { w: 1520, h: 665, fit: "fill" })} alt={article.title} width={1520} height={665} priority sizes="(max-width: 800px) 100vw, 760px" />
          </div>
          <div className="article__body">
            <p className="t-reg-16">{article.excerpt}</p>
            <div className="article__note t-reg-16">
              The full guide is being prepared from the Arc Trips article library and will appear here soon.
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
