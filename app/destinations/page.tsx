import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDestinations, getNavigableSlugs } from "@/app/lib/content";
import { cld, IMG } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";

export const metadata: Metadata = {
  title: "Destinations | Arc Trips",
  description: "Explore Arc Trips destinations across Canada, from Tofino to Ucluelet: where to stay, what to do, and local guides for every area.",
};

export default async function DestinationsPage() {
  const [destinations, navigable] = await Promise.all([getDestinations(), getNavigableSlugs()]);
  const live = destinations.filter((d) => navigable.includes(d.slug));
  const soon = destinations.filter((d) => !navigable.includes(d.slug));

  return (
    <>
      <TopNav active="destinations" />

      <section className="container" style={{ paddingTop: 24 }}>
        <div className="banner" style={{ minHeight: 300 }}>
          <Image src={cld(IMG.aerial, { w: 2000, fit: "limit" })} alt="" width={2000} height={600} sizes="100vw" />
          <div className="banner__scrim" aria-hidden="true" />
          <div className="banner__content">
            <h1 className="t-h1" style={{ color: "#fff" }}>Explore our destinations</h1>
            <p className="t-reg-16" style={{ color: "#F2F6FB", maxWidth: 620 }}>
              Local guides to the places we know well: where to stay, what to do, and how to make the most of every trip.
            </p>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="t-h2" style={{ marginBottom: 24 }}>All destinations</h2>
        <div className="dest-cards">
          {live.map((d) => (
            <Link key={d.slug} className="dcard" href={`/destinations/${d.slug}`}>
              <Image src={cld(d.heroPublicId, { w: 900, h: 640, fit: "fill" })} alt={d.name} width={900} height={640} sizes="(max-width: 600px) 100vw, 33vw" />
              <div className="dcard__scrim" aria-hidden="true" />
              <div className="dcard__body">
                <p className="dcard__name t-h3">{d.name}</p>
                <p className="dcard__meta t-med-14">{d.region}{d.listingCount ? ` · ${d.listingCount} stays` : ""}</p>
              </div>
            </Link>
          ))}
          {soon.map((d) => (
            <div key={d.slug} className="dcard dcard--soon" aria-disabled="true">
              <Image src={cld(d.heroPublicId, { w: 900, h: 640, fit: "fill" })} alt={d.name} width={900} height={640} sizes="(max-width: 600px) 100vw, 33vw" />
              <div className="dcard__scrim" aria-hidden="true" />
              <span className="dcard__badge t-med-12">Coming soon</span>
              <div className="dcard__body">
                <p className="dcard__name t-h3">{d.name}</p>
                <p className="dcard__meta t-med-14">{d.region}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
