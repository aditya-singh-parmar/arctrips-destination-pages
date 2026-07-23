import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDestinations, getListings, getNavigableSlugs } from "@/app/lib/content";
import { cld, IMG } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { ScrollRow } from "@/app/components/landing/ScrollRow";
import { ListingCard } from "@/app/components/landing/ListingCard";
import { FindAStayBand } from "@/app/components/landing/Banners";

export const metadata: Metadata = {
  title: "Destinations | Arc Trips",
  description: "Explore Arc Trips destinations across Canada, from Tofino to Ucluelet: where to stay, what to do, and local guides for every area.",
};

export default async function DestinationsPage() {
  const [destinations, popular, holiday, navigable] = await Promise.all([
    getDestinations(),
    getListings(),
    getListings({ holiday: true }),
    getNavigableSlugs(),
  ]);

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

      <section className="container section" style={{ paddingBottom: 8 }}>
        <h2 className="t-h2" style={{ marginBottom: 20 }}>Where to next?</h2>
        <div className="dest-cards">
          {destinations.map((d) => {
            const ready = navigable.includes(d.slug);
            const inner = (
              <>
                <Image src={cld(d.heroPublicId, { w: 640, h: 512, fit: "fill" })} alt={d.name} width={640} height={512} sizes="(max-width: 720px) 50vw, 25vw" />
                <div className="dcard__scrim" aria-hidden="true" />
                {!ready && <span className="dcard__badge t-med-12">Coming soon</span>}
                <div className="dcard__body">
                  <p className="dcard__name t-bold-20">{d.name}</p>
                  <p className="dcard__meta t-med-14">{d.region}{d.listingCount ? ` · ${d.listingCount} stays` : ""}</p>
                </div>
              </>
            );
            return ready ? (
              <Link key={d.slug} className="dcard" href={`/destinations/${d.slug}`}>{inner}</Link>
            ) : (
              <div key={d.slug} className="dcard dcard--soon">{inner}</div>
            );
          })}
        </div>
      </section>

      <ScrollRow title="Popular stays right now">
        {popular.slice(0, 8).map((l) => <ListingCard key={l.id} listing={l} />)}
      </ScrollRow>

      <ScrollRow title="Get away for the holiday" viewAll="View all listings">
        {holiday.map((l) => <ListingCard key={l.id} listing={l} variant="holiday" />)}
      </ScrollRow>

      <FindAStayBand />
      <Footer />
    </>
  );
}
