import Image from "next/image";
import Link from "next/link";
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
 * tree, where `trail` carries the geographic scope, and the flat
 * /guides/[slug] route kept alive for links shipped before the tree existed,
 * where it does not.
 *
 * One centred column, same as a category guide, so a reader moving between the
 * two never changes reading posture.
 */
export function GuideDetail({ article, trail = [] }: { article: Article; trail?: GeoNode[] }) {
  const body = article.body ?? [];
  // The lead is promoted into the banner, so it must not open the body too.
  const leadIndex = body.findIndex((b) => b.type === "p" && b.text);
  const rest = leadIndex === -1 ? body : body.filter((_, i) => i !== leadIndex);
  const standfirst = article.excerpt || lead(body);
  const home = trail.length ? geoPath(trail) : "/destinations";

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

      <div className="dx">
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
        </div>

        <header className="hero">
          <div className="container">
            <div className="hero__b hero__b--sm">
              {article.heroPublicId && (
                <span className="hero__img">
                  <Image
                    src={cld(article.heroPublicId, { w: 1800, h: 600, fit: "fill" })}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    style={{ objectFit: "cover" }}
                  />
                </span>
              )}
              <div className="hero__t">
                {article.category && <span className="hero__pill">{article.category}</span>}
                <h1>{article.title}</h1>
                {standfirst && <p>{standfirst}</p>}
              </div>
            </div>
          </div>
        </header>

        {rest.length > 0 && (
          <section className="sec">
            <div className="container">
              <div className="col">
                <ArticleBlocks blocks={rest} />
              </div>
            </div>
          </section>
        )}

        {(article.faqs?.length ?? 0) > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="sechead center">
                <h2>Common questions.</h2>
              </div>
              <div className="col">
                <FaqList faqs={article.faqs ?? []} />
              </div>
            </div>
          </section>
        )}

        <section className="sec sec--flush">
          <div className="container">
            <div className="closing">
              <p>
                <b>Where this happens.</b> Everything we publish sits inside a destination, with the guides, the
                months and the places to stay in one place.
              </p>
              <Link className="btn btn--primary" href={home}>
                {trail.length ? `Go to ${trail[trail.length - 1].name}` : "See every destination"}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
