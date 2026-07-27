import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGeoChildLinks, getTownsBeneath } from "@/app/lib/geo";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { cld, IMG } from "@/app/lib/cloudinary";
import { breadcrumbList, itemList, touristDestination } from "@/app/lib/jsonld";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { JsonLd } from "@/app/components/ui/JsonLd";
import { SectionHead } from "@/app/components/ui/SectionHead";

const SITE = "https://arctrips.com";

const TIER_LABEL: Record<string, string> = {
  country: "Provinces and territories",
  province: "Regions and towns",
  region: "Towns",
};

/**
 * One template for country, province and region. They differ only in what
 * their children are called, so they share a body rather than three near
 * identical files. Replaces the Plan 1 workaround where these tiers borrowed
 * the landing page under noindex.
 *
 * Shape: a head that is typographic when the tier carries no photograph of
 * its own (a province rarely does), one lead-weighted card grid for the next
 * tier down, and then a ruled index of every town beneath, rather than the
 * second identical card grid this page used to render. Two grids of the same
 * card at the same size is the marketplace look the redesign is escaping,
 * and the second one is a list, so it should read as a list.
 */
export async function GeoIndex({ node, trail }: { node: GeoNode; trail: GeoNode[] }) {
  const [children, towns] = await Promise.all([getGeoChildLinks(trail), getTownsBeneath(trail)]);
  // A child with no renderable town beneath it is dropped, so an index never
  // links to its own 404s and an empty province never renders as a real page.
  const withContent = children.filter((c) => c.townCount > 0);

  // AC 51: a tier with nothing published beneath it is not rendered at all.
  // Six empty provinces rendering an identical "nothing here yet" page is
  // thin content. Safe for breadcrumbs: a page only renders when it has a
  // navigable town beneath it, so no ancestor of a live page can be empty.
  if (withContent.length === 0 && !node.standfirst && node.body.length === 0) notFound();
  const url = `${SITE}${geoPath(trail)}`;

  const crumbs = [
    { href: "/destinations", label: "Destinations" },
    ...trail.slice(0, -1).map((n, i) => ({ href: geoPath(trail.slice(0, i + 1)), label: n.name })),
    { label: node.name },
  ];
  const ancestry = trail.slice(0, -1).map((n) => n.name).reverse().join(", ");
  const townLabel = `${towns.length} destination${towns.length === 1 ? "" : "s"}`;

  return (
    <>
      <TopNav active="destinations" />
      <JsonLd data={breadcrumbList([
        { name: "Destinations", url: `${SITE}/destinations` },
        ...trail.map((n, i) => ({ name: n.name, url: `${SITE}${geoPath(trail.slice(0, i + 1))}` })),
      ])} />
      <JsonLd data={touristDestination(node, url, node.standfirst)} />
      <JsonLd data={itemList(
        withContent.map((c) => ({ name: c.node.name, url: `${SITE}${c.path}` })),
        `Destinations in ${node.name}`,
      )} />

      <div className="container">
        <Breadcrumb trail={crumbs} />
      </div>

      {node.heroPublicId ? (
        <header className="dhero dhero--sm">
          <div className="dhero__media">
            <Image
              src={cld(node.heroPublicId, { w: 2000, fit: "limit" })}
              alt={node.name}
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="dhero__scrim" aria-hidden="true" />
          <div className="dhero__inner container">
            {ancestry && <p className="t-eyebrow t-eyebrow--invert">{ancestry}</p>}
            <h1 className="t-h0">{node.name}</h1>
            {node.standfirst && <p className="dhero__sub">{node.standfirst}</p>}
            {towns.length > 0 && (
              <p className="dhero__meta"><span><b>{towns.length}</b> destinations published</span></p>
            )}
          </div>
        </header>
      ) : (
        <div className="container">
          <header className="geohead">
            {ancestry && <span className="t-eyebrow">{ancestry}</span>}
            <h1 className="t-h0">{node.name}</h1>
            {node.standfirst && <p className="geohead__sub">{node.standfirst}</p>}
            {towns.length > 0 && (
              <p className="geohead__meta">
                <span><b>{towns.length}</b> destinations published</span>
                <span><b>{withContent.length}</b> {(TIER_LABEL[node.type] ?? "areas").toLowerCase()}</span>
              </p>
            )}
          </header>
        </div>
      )}

      <div className="container">
        {node.body.length > 0 && (
          <section className="section section--tight">
            <div className="prose">
              <ArticleBlocks blocks={node.body} />
            </div>
          </section>
        )}

        {withContent.length > 0 ? (
          <section className="section">
            <SectionHead
              ruled
              eyebrow="Go deeper"
              title={TIER_LABEL[node.type] ?? "Places"}
              description={towns.length ? `${townLabel} published in ${node.name}.` : undefined}
            />
            <div className="dest-cards dest-cards--lead">
              {withContent.map(({ node: child, path, townCount }) => (
                <Link key={child.id} className="dcard" href={path}>
                  <Image
                    src={child.heroPublicId
                      ? cld(child.heroPublicId, { w: 1200, h: 800, fit: "fill" })
                      : cld(IMG.coast, { w: 1200, h: 800, fit: "fill" })}
                    alt={child.name}
                    width={1200}
                    height={800}
                    sizes="(max-width: 620px) 100vw, 50vw"
                  />
                  <div className="dcard__scrim" aria-hidden="true" />
                  <div className="dcard__body">
                    <p className="dcard__name t-bold-20">{child.name}</p>
                    <p className="dcard__meta t-med-14">
                      {child.type === "town"
                        ? "Destination guide"
                        : `${townCount} destination${townCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          // Never an empty grid: say so plainly and give a way onward.
          <div className="section">
            <div className="softnote">
              Nothing is published in {node.name} yet.{" "}
              <Link href="/destinations">See every destination</Link>.
            </div>
          </div>
        )}

        {node.type !== "region" && towns.length > 0 && (
          <section className="section section--open">
            <SectionHead
              ruled
              eyebrow="The index"
              title={`Every destination in ${node.name}`}
              description="Skip the tiers and go straight to a town."
            />
            <div className="idx">
              {towns.map(({ node: t, path }) => (
                <Link key={t.id} className="idx__row" href={path}>
                  <span className="idx__media">
                    <Image
                      src={t.heroPublicId
                        ? cld(t.heroPublicId, { w: 464, h: 348, fit: "fill" })
                        : cld(IMG.coast, { w: 464, h: 348, fit: "fill" })}
                      alt=""
                      width={232}
                      height={174}
                      sizes="116px"
                    />
                  </span>
                  <span className="idx__b">
                    <span className="idx__t">{t.name}</span>
                    {t.standfirst && <span className="idx__d">{t.standfirst}</span>}
                  </span>
                  <span className="idx__v">Destination guide</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
