import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCategoriesAcrossCities, getCityCategory } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";

export const metadata: Metadata = {
  title: "Things to do | Arc Trips",
  description: "Categories across every destination. Each one leads to a guide, and where there is a trip to book it is inside that guide.",
};

/**
 * S1's curated categories landing (owner-approved 2026-07-24): this is
 * where every category lives, since a standalone category page would
 * recreate the thin layer the owner rejected while there are only two
 * towns. A category card links straight to a destination's guide; once a
 * category spans three or more destinations, a real `/things-to-do/[slug]`
 * page starts earning its keep. See design/structure/s1/things-to-do.html.
 */
export default async function ThingsToDoPage() {
  const categories = await getCategoriesAcrossCities();
  const whaleWatching = categories.find((c) => c.categorySlug === "whale-watching");
  const whaleWatchingHero = whaleWatching ? await getCityCategory(whaleWatching.cities[0].citySlug, "whale-watching") : null;

  return (
    <>
      <TopNav active="destinations" />

      <div className="container">
        <div className="section" style={{ paddingBottom: 24 }}>
          <div className="rowhead">
            <div>
              <h2 className="t-h2">Things to do</h2>
              <p className="t-reg-14" style={{ marginTop: 4 }}>
                Categories across every destination. Each one leads to a guide, and where there is a trip to book it
                is inside that guide.
              </p>
            </div>
          </div>

          {whaleWatching && whaleWatchingHero?.heroPublicId && (
            <div className="now">
              <div className="now__media">
                <Image src={cld(whaleWatchingHero.heroPublicId, { w: 1000, fit: "limit" })} alt="" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
              </div>
              <div className="now__b">
                <span className="kicker">Right now</span>
                <h3>The grey whales are arriving</h3>
                <p>
                  Twenty thousand of them pass Clayoquot Sound over about six weeks. Boats are running daily from
                  both towns and sightings are close to guaranteed until early May.
                </p>
                <Link className="btn btn--white" href={`/${whaleWatching.cities[0].citySlug}/whale-watching`}>
                  Read the whale watching guide
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="section" style={{ paddingTop: 24 }}>
          <div className="rowhead">
            <div>
              <h2 className="t-h2">Curated by the editors</h2>
              <p className="t-reg-14" style={{ marginTop: 4 }}>Cuts across categories. Hand-picked, re-cut every season.</p>
            </div>
          </div>
          <div className="collections">
            <div className="coll">
              <h4>Free, and worth the drive</h4>
              <p>Costs nothing but petrol and a waterproof.</p>
              <ul>
                <li><Link href="/tofino/beaches"><span>The thirteen beaches</span><span>Tofino</span></Link></li>
                <li><Link href="/ucluelet/hiking"><span>Wild Pacific Trail</span><span>Ucluelet</span></Link></li>
                <li><Link href="/tofino/storm-watching"><span>Storm watching</span><span>Nov to Feb</span></Link></li>
              </ul>
            </div>
            <div className="coll">
              <h4>When it rains, and it will</h4>
              <p>The coast gets three metres a year. Plan for it.</p>
              <ul>
                <li><Link href="/tofino/restaurants"><span>Where to eat</span><span>Tofino</span></Link></li>
                <li><Link href="/tofino/whale-watching"><span>Covered whale boats</span><span>heated</span></Link></li>
                <li><Link href="/tofino/hiking"><span>Rainforest boardwalks</span><span>short</span></Link></li>
              </ul>
            </div>
            <div className="coll">
              <h4>On the water</h4>
              <p>Everything that involves getting properly wet.</p>
              <ul>
                <li><Link href="/tofino/whale-watching"><span>Whale watching</span><span>from $149</span></Link></li>
                <li><Link href="/tofino/surfing"><span>Learning to surf</span><span>from $119</span></Link></li>
                <li><Link href="/tofino/fishing"><span>Fishing charters</span><span>from $189</span></Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="section" style={{ paddingTop: 8 }}>
          <div className="rowhead">
            <div>
              <h2 className="t-h2">Every category</h2>
              <p className="t-reg-14" style={{ marginTop: 4 }}>
                Each card shows which destinations have a guide for it. Pick the town and you land straight on the
                guide.
              </p>
            </div>
          </div>

          <div className="grid-3">
            {categories.map((c) => (
              <Link key={c.categorySlug} className="cat" href={`/${c.cities[0].citySlug}/${c.categorySlug}`}>
                {c.heroPublicId && <Image src={cld(c.heroPublicId, { w: 600, fit: "limit" })} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" style={{ objectFit: "cover" }} />}
                <span className="cat__scrim" aria-hidden="true" />
                {c.state === "live" && c.priceFrom !== undefined && <span className="cat__price">from ${c.priceFrom}</span>}
                {c.state === "sister" && <span className="cat__price">ArcTrips Fishing</span>}
                {c.state === "soon" && <span className="cat__price cat__price--soon">Coming soon</span>}
                <div className="cat__b">
                  <h3>{c.name}</h3>
                  <div className="cat__where">
                    {c.cities.map((city) => <span key={city.citySlug}>{city.cityName}</span>)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="softnote" style={{ marginTop: 22 }}>
            <b>The structural decision made here.</b> A category card links straight to the destination&rsquo;s
            guide, because with two towns there is nothing in between worth a page. Once a category has three or
            more destinations, a category page (for example <b>/things-to-do/whale-watching</b> listing every town
            that offers it) starts earning its keep.
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
