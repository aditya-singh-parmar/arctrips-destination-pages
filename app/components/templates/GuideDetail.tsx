import Image from "next/image";
import type { Article } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { geoPath, guidePath, type GeoNode } from "@/app/lib/geo-types";
import { articleLd, breadcrumbList } from "@/app/lib/jsonld";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { FaqList } from "@/app/components/browse/FaqList";

const SITE = "https://arctrips.com";

type Block = { type: string; text?: string };

export function lead(body: Block[]): string | undefined {
  const p = body.find((b) => b.type === "p" && b.text)?.text;
  if (!p) return undefined;
  return p.length > 220 ? `${p.slice(0, 217)}...` : p;
}

/**
 * Guide and article detail. Reached from two places: the deep travel-guides
 * tree, where `trail` carries the geographic scope, and the flat /guides/[slug]
 * route kept alive for links shipped before the tree existed, where it does not.
 */
export function GuideDetail({ article, trail = [] }: { article: Article; trail?: GeoNode[] }) {
  const body = article.body ?? [];
  // The lead is promoted into the hero, so it must not open the body too.
  const leadIndex = body.findIndex((b) => b.type === "p" && b.text);
  const rest = leadIndex === -1 ? body : body.filter((_, i) => i !== leadIndex);
  const standfirst = article.excerpt || lead(body);

  const url = `${SITE}${guidePath(trail, article.slug)}`;

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={breadcrumbList([
        { name: "Destinations", url: `${SITE}/destinations` },
        ...trail.map((n, i) => ({ name: n.name, url: `${SITE}${geoPath(trail.slice(0, i + 1))}` })),
        { name: article.title },
      ])} />
      <JsonLd data={articleLd({
        title: article.title,
        url,
        image: article.heroPublicId ? cld(article.heroPublicId, { w: 1200, fit: "limit" }) : undefined,
      })} />
      <div className="container">
        <Breadcrumb
          trail={[
            { href: "/destinations", label: "Destinations" },
            ...trail.map((node, i) => ({
              href: geoPath(trail.slice(0, i + 1)),
              label: node.name,
            })),
            { label: article.title },
          ]}
        />

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
