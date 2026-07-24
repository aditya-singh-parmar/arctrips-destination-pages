import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRegions, getDestinations, getCity } from "@/app/lib/content";
import { cld, IMG } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";

export const metadata: Metadata = {
  title: "Destinations | Arc Trips",
  description: "Explore Arc Trips destinations by region: where to stay, what to do, and local guides for every area.",
};

/**
 * Region-first per Task 12 (spec section 3: regions are routable, cities sit
 * at the root). Previously this page listed cities directly and linked to
 * the now-deleted `/destinations/[slug]` sidebar route; it lists regions
 * now, each linking to `/destinations/{region}`, which in turn lists that
 * region's cities at their real `/{city}` routes.
 */
export default async function DestinationsPage() {
  const regions = await getRegions();
  const destinations = await getDestinations();
  const cityCounts = await Promise.all(
    regions.map(async (r) => {
      const cities = await Promise.all(destinations.map((d) => getCity(d.slug)));
      return cities.filter((c) => c?.regionSlug === r.slug).length;
    }),
  );

  return (
    <>
      <TopNav active="destinations" />

      <section className="container" style={{ paddingTop: 24 }}>
        <div className="banner" style={{ minHeight: 260 }}>
          <Image src={cld(IMG.aerial, { w: 2000, fit: "limit" })} alt="" width={2000} height={520} sizes="100vw" />
          <div className="banner__scrim" aria-hidden="true" />
          <div className="banner__content">
            <h1 className="t-h1" style={{ color: "#fff" }}>Explore our destinations</h1>
            <p className="t-reg-16" style={{ color: "#F2F6FB", maxWidth: 620 }}>
              Local guides to the places we know well: where to stay, what to do, and how to make the most of every trip.
            </p>
          </div>
        </div>
      </section>

      <section className="container section" style={{ paddingBottom: 40 }}>
        <h2 className="t-h2" style={{ marginBottom: 20 }}>Regions</h2>
        <div className="dest-cards">
          {regions.map((r, i) => (
            <Link key={r.slug} className="dcard" href={`/destinations/${r.slug}`}>
              <Image src={cld(r.heroPublicId, { w: 640, h: 512, fit: "fill" })} alt={r.name} width={640} height={512} sizes="(max-width: 720px) 50vw, 25vw" />
              <div className="dcard__scrim" aria-hidden="true" />
              <div className="dcard__body">
                <p className="dcard__name t-bold-20">{r.name}</p>
                <p className="dcard__meta t-med-14">{cityCounts[i]} {cityCounts[i] === 1 ? "destination" : "destinations"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
