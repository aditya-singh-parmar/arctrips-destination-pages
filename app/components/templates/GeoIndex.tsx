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
import { SearchCard, type SearchItem } from "@/app/components/ui/SearchCard";

const SITE = "https://arctrips.com";

const TIER_LABEL: Record<string, string> = {
  country: "Provinces and territories",
  province: "Regions and towns",
  region: "Towns",
};

/**
 * One template for country, province and region: they differ only in what
 * their children are called, so they share a body rather than three near
 * identical files.
 *
 * Same language as the rest of the experience, the inset banner and the
 * contained column, with the next tier down as light bordered cards and every
 * town beneath as a plain index. A tier with nothing published beneath it is
 * not rendered at all: six empty provinces rendering an identical "nothing
 * here yet" page is thin content.
 */
export async function GeoIndex({ node, trail }: { node: GeoNode; trail: GeoNode[] }) {
  const [children, towns] = await Promise.all([getGeoChildLinks(trail), getTownsBeneath(trail)]);
  const withContent = children.filter((c) => c.townCount > 0);

  if (withContent.length === 0 && !node.standfirst && node.body.length === 0) notFound();
  const url = `${SITE}${geoPath(trail)}`;

  const crumbs = [
    { href: "/destinations", label: "Destinations" },
    ...trail.slice(0, -1).map((n, i) => ({ href: geoPath(trail.slice(0, i + 1)), label: n.name })),
    { label: node.name },
  ];
  const ancestry = trail.slice(0, -1).map((n) => n.name).reverse().join(", ");
  const heroPublicId = node.heroPublicId ?? towns[0]?.node.heroPublicId ?? IMG.coast;

  const searchIndex: SearchItem[] = towns.map(({ node: t, path }) => ({
    label: t.name,
    sub: "Destination",
    href: path,
  }));

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

      <div className="dx">
        <div className="container">
          <Breadcrumb trail={crumbs} />
        </div>

        <header className="hero">
          <div className="container">
            <div className="hero__b hero__b--sm">
              <span className="hero__img">
                <Image
                  src={cld(heroPublicId, { w: 1800, h: 620, fit: "fill" })}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                />
              </span>
              <div className="hero__t">
                {ancestry && <span className="hero__pill">{ancestry}</span>}
                <h1>{node.name}</h1>
                {node.standfirst && <p>{node.standfirst}</p>}
                {towns.length > 0 && (
                  <p className="hero__meta">
                    <span><b>{towns.length}</b> destinations published</span>
                    {withContent.length > 0 && (
                      <span>
                        <b>{withContent.length}</b> {(TIER_LABEL[node.type] ?? "areas").toLowerCase()}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {searchIndex.length > 0 && (
              <SearchCard
                items={searchIndex}
                placeholder={`Search destinations in ${node.name}`}
                note={`Searches every destination published in ${node.name}.`}
              />
            )}
          </div>
        </header>

        {node.body.length > 0 && (
          <section className="sec">
            <div className="container">
              <div className="col">
                <ArticleBlocks blocks={node.body} />
              </div>
            </div>
          </section>
        )}

        {/* Flush only when a body section already opened the rhythm above it,
            otherwise this would sit tight under the search card. */}
        {withContent.length > 0 ? (
          <section className={node.body.length > 0 ? "sec sec--flush" : "sec"}>
            <div className="container">
              <div className="sechead center">
                <span className="eyebrow">Go deeper</span>
                <h2>{TIER_LABEL[node.type] ?? "Places"}.</h2>
                {towns.length > 0 && (
                  <p className="sub">
                    {towns.length} destination{towns.length === 1 ? "" : "s"} published in {node.name}.
                  </p>
                )}
              </div>
              <div className="dgrid">
                {withContent.map(({ node: child, path, townCount }) => (
                  <Link key={child.id} className="dcard" href={path}>
                    <div className="dcard__m">
                      <Image
                        src={cld(child.heroPublicId ?? IMG.coast, { w: 620, h: 465, fit: "fill" })}
                        alt={child.name}
                        width={620}
                        height={465}
                        sizes="(max-width: 520px) 100vw, (max-width: 980px) 50vw, 270px"
                      />
                    </div>
                    <div className="dcard__b">
                      <h3>{child.name}</h3>
                      <p className="dcard__meta">
                        {child.type === "town"
                          ? "Destination guide"
                          : `${townCount} destination${townCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className={node.body.length > 0 ? "sec sec--flush" : "sec"}>
            <div className="container">
              <p className="softnote">
                Nothing is published in {node.name} yet.{" "}
                <Link href="/destinations">See every destination</Link>.
              </p>
            </div>
          </section>
        )}

        {node.type !== "region" && towns.length > 0 && (
          <section className="sec sec--flush">
            <div className="container">
              <div className="panel panel--grey">
                <div className="sechead center">
                  <span className="eyebrow">The index</span>
                  <h2>Every destination in {node.name}.</h2>
                  <p className="sub">Skip the tiers and go straight to a town.</p>
                </div>
                <div className="col">
                  <div className="idx">
                    {towns.map(({ node: t, path }) => (
                      <Link key={t.id} className="idx__row" href={path}>
                        <span className="idx__media">
                          <Image
                            src={cld(t.heroPublicId ?? IMG.coast, { w: 288, h: 216, fit: "fill" })}
                            alt=""
                            width={288}
                            height={216}
                            sizes="96px"
                          />
                        </span>
                        <span>
                          <span className="idx__t">{t.name}</span>
                          {t.standfirst && <span className="idx__d">{t.standfirst}</span>}
                        </span>
                        <span className="idx__v">Destination guide</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
