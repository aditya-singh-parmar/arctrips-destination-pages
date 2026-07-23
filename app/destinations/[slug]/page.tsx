import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDestinations, getListings } from "@/app/lib/content";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";
import { ScrollRow } from "@/app/components/landing/ScrollRow";
import { ListingCard } from "@/app/components/landing/ListingCard";

/* Phase 2 placeholder. The full area/destination page (top-menu / sidebar
   section navigation over the New Articles corpus) is built once Sam's
   "Destination structure page" lands. For now this lists the area's stays. */

export async function generateStaticParams() {
  const dests = await getDestinations();
  return dests.filter((d) => !d.comingSoon).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dest = (await getDestinations()).find((d) => d.slug === slug);
  return { title: dest ? `${dest.name} — Arc Trips` : "Arc Trips" };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dest = (await getDestinations()).find((d) => d.slug === slug);
  if (!dest) notFound();
  const listings = await getListings({ destinationSlug: slug });

  return (
    <>
      <TopNav />
      <section className="container section" style={{ paddingTop: 32 }}>
        <h1 className="t-h1">{dest.name}</h1>
        <p className="t-reg-16" style={{ color: "var(--n-700)", marginTop: 8 }}>{dest.region}</p>
      </section>
      <ScrollRow title={`Stays in ${dest.name}`}>
        {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
      </ScrollRow>
      <Footer />
    </>
  );
}
