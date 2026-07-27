import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGeoChildLinks } from "@/app/lib/geo";
import { geoPath, type GeoNode } from "@/app/lib/geo-types";
import { cld, IMG } from "@/app/lib/cloudinary";
import { breadcrumbList, itemList, touristDestination } from "@/app/lib/jsonld";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { Breadcrumb } from "@/app/components/nav/Breadcrumb";
import { JsonLd } from "@/app/components/ui/JsonLd";

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
 */
export async function GeoIndex({ node, trail }: { node: GeoNode; trail: GeoNode[] }) {
  const children = await getGeoChildLinks(trail);
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

        <div className="section" style={{ paddingBottom: 16 }}>
          <div className="rowhead">
            <div>
              <h1 className="t-h1">{node.name}</h1>
              {node.standfirst && (
                <p className="t-reg-14" style={{ marginTop: 6, maxWidth: "62ch" }}>{node.standfirst}</p>
              )}
            </div>
          </div>
        </div>

        {withContent.length > 0 ? (
          <div className="section" style={{ paddingTop: 0 }}>
            <div className="rowhead">
              <div><h2 className="t-h2">{TIER_LABEL[node.type] ?? "Places"}</h2></div>
            </div>
            <div className="dest-cards">
              {withContent.map(({ node: child, path, townCount }) => (
                <Link key={child.id} className="dcard" href={path}>
                  <Image
                    src={child.heroPublicId
                      ? cld(child.heroPublicId, { w: 640, h: 512, fit: "fill" })
                      : cld(IMG.coast, { w: 640, h: 512, fit: "fill" })}
                    alt={child.name}
                    width={640}
                    height={512}
                    sizes="(max-width: 720px) 50vw, 25vw"
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
          </div>
        ) : (
          // Never an empty grid: say so plainly and give a way onward.
          <div className="section" style={{ paddingTop: 0 }}>
            <div className="softnote">
              Nothing is published in {node.name} yet.{" "}
              <Link href="/destinations">See every destination</Link>.
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
