import { getDestinations, getListings, getReviews, getNavigableSlugs } from "@/app/lib/content";

// ISR: re-read Supabase in the background so content stays in sync without a rebuild.
export const revalidate = 300;

import { TopNav } from "@/app/components/landing/TopNav";
import { Hero } from "@/app/components/landing/Hero";
import { ScrollRow } from "@/app/components/landing/ScrollRow";
import { ListingCard } from "@/app/components/landing/ListingCard";
import { ExploreDestinations } from "@/app/components/landing/ExploreDestinations";
import { CultureOfExcellence } from "@/app/components/landing/CultureOfExcellence";
import { Reviews } from "@/app/components/landing/Reviews";
import { HowItWorks } from "@/app/components/landing/HowItWorks";
import { EmailCapture } from "@/app/components/landing/EmailCapture";
import { ListYourAccommodation, FindAStayBand } from "@/app/components/landing/Banners";
import { PromiseCards } from "@/app/components/landing/PromiseCards";
import { Footer } from "@/app/components/landing/Footer";

export default async function HomePage() {
  const [destinations, recentlyViewed, tofino, ucluelet, holiday, reviews, navigable] = await Promise.all([
    getDestinations(),
    getListings(),
    getListings({ destinationSlug: "tofino" }),
    getListings({ destinationSlug: "ucluelet" }),
    getListings({ holiday: true }),
    getReviews(),
    getNavigableSlugs(),
  ]);

  return (
    <>
      <TopNav />
      <Hero />

      <ScrollRow title="Your recently viewed listings">
        {recentlyViewed.slice(0, 6).map((l) => <ListingCard key={l.id} listing={l} />)}
      </ScrollRow>

      <ExploreDestinations destinations={destinations} navigable={navigable} />

      <ScrollRow title="Our most viewed listings in Tofino" arrowsLeft viewAll="View all listings in Tofino">
        {tofino.map((l) => <ListingCard key={l.id} listing={l} />)}
      </ScrollRow>

      <ScrollRow title="Our most viewed listings in Ucluelet" arrowsLeft viewAll="View all listings in Ucluelet">
        {ucluelet.map((l) => <ListingCard key={l.id} listing={l} />)}
      </ScrollRow>

      <ScrollRow title="Get away for the holiday" viewAll="View all listings">
        {holiday.map((l) => <ListingCard key={l.id} listing={l} variant="holiday" />)}
      </ScrollRow>

      <CultureOfExcellence />
      <Reviews reviews={reviews} />
      <HowItWorks />
      <EmailCapture />
      <ListYourAccommodation />
      <PromiseCards />
      <FindAStayBand />
      <Footer />
    </>
  );
}
