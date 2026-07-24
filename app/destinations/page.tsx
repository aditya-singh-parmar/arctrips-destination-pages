import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDestinations, getCity, getGuidesForCity } from "@/app/lib/content";
import { cld } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";

export const metadata: Metadata = {
  title: "Destinations | Arc Trips",
  description: "The places we know properly: where to stay, what to do, and local guides written by people who go there.",
};

/**
 * S1 destination-first spine, no region tier (owner-approved 2026-07-24).
 * Curated, not an auto-filter: one editors' pick leads, three hand-built
 * collections cut across it, and the plain index sits below. Coming-soon
 * destinations render but never link, so the page grows without ever
 * leading somewhere empty. See design/structure/s1/destinations.html.
 */
export default async function DestinationsPage() {
  const destinations = await getDestinations();

  const rows = await Promise.all(
    destinations.map(async (d) => {
      const guides = await getGuidesForCity(d.slug);
      const city = guides.length > 0 ? await getCity(d.slug) : null;
      return { destination: d, guideCount: guides.length, city, navigable: guides.length > 0 && city !== null };
    }),
  );

  const live = rows.filter((r) => r.navigable);
  const comingSoon = rows.filter((r) => !r.navigable);
  const tofino = live.find((r) => r.destination.slug === "tofino");
  const ucluelet = live.find((r) => r.destination.slug === "ucluelet");

  return (
    <>
      <TopNav active="destinations" />

      <div className="container">
        {tofino?.city && (
          <div className="section" style={{ paddingBottom: 24 }}>
            <div className="rowhead">
              <div>
                <h2 className="t-h2">Two towns we know properly</h2>
                <p className="t-reg-14" style={{ marginTop: 4 }}>
                  We only publish a destination once we have stayed there, walked it, and can answer the awkward
                  questions.
                </p>
              </div>
            </div>

            <div className="feature">
              <Link className="feature__media" href={`/${tofino.destination.slug}`}>
                <Image src={cld(tofino.city.heroPublicId, { w: 1400, fit: "limit" })} alt={tofino.city.name} fill sizes="(max-width: 900px) 100vw, 60vw" style={{ objectFit: "cover" }} />
                <span className="feature__scrim" aria-hidden="true" />
                <div className="feature__cap">
                  <span className="kicker">Editors&rsquo; pick</span>
                  <h3>{tofino.city.name}</h3>
                  <p>{tofino.city.standfirst}</p>
                </div>
              </Link>
              <div className="feature__side">
                <Link className="mini" href={`/${tofino.destination.slug}`}>
                  <Image src={cld(tofino.city.heroPublicId, { w: 400, fit: "limit" })} alt="" width={130} height={130} style={{ height: "100%" }} />
                  <div className="mini__b">
                    <b>{tofino.city.name}</b>
                    <p>{tofino.guideCount} guides &middot; {tofino.city.listingCount} stays</p>
                  </div>
                </Link>
                {ucluelet?.city && (
                  <Link className="mini" href={`/${ucluelet.destination.slug}`}>
                    <Image src={cld(ucluelet.city.heroPublicId, { w: 400, fit: "limit" })} alt="" width={130} height={130} style={{ height: "100%" }} />
                    <div className="mini__b">
                      <b>{ucluelet.city.name}</b>
                      <p>{ucluelet.guideCount} guides &middot; {ucluelet.city.listingCount} stays</p>
                    </div>
                  </Link>
                )}
                {comingSoon.length > 0 && (
                  <div className="mini" style={{ background: "var(--n-50)" }}>
                    <Image
                      src={cld(tofino.city.heroPublicId, { w: 400, fit: "limit" })}
                      alt=""
                      width={130}
                      height={130}
                      style={{ height: "100%", filter: "grayscale(1)", opacity: 0.5 }}
                    />
                    <div className="mini__b">
                      <b style={{ color: "var(--n-500)" }}>
                        {comingSoon.map((r) => r.destination.name).join(", ")}
                      </b>
                      <p>Coming soon. Tell us which you want first.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="section">
          <div className="rowhead">
            <div>
              <h2 className="t-h2">Pick by what the trip is for</h2>
              <p className="t-reg-14" style={{ marginTop: 4 }}>
                Hand-picked by the editors. Every list is a judgement call, not a filter.
              </p>
            </div>
          </div>
          <div className="collections">
            <div className="coll">
              <h4>First time on the coast</h4>
              <p>You have three days and want the version everyone remembers.</p>
              <ul>
                <li><Link href="/tofino"><span>Tofino</span><span>3 days</span></Link></li>
                <li><Link href="/tofino/whale-watching"><span>Whale watching</span><span>from $149</span></Link></li>
                <li><Link href="/tofino/beaches"><span>The thirteen beaches</span><span>free</span></Link></li>
              </ul>
            </div>
            <div className="coll">
              <h4>Going in winter</h4>
              <p>Half the price, twice the weather, and the beaches to yourself.</p>
              <ul>
                <li><Link href="/tofino/storm-watching"><span>Storm watching</span><span>Nov to Feb</span></Link></li>
                <li><Link href="/tofino#stays"><span>Where to stay for storms</span><span>see stays</span></Link></li>
                <li><Link href="/tofino#planning"><span>Best time to visit</span><span>guide</span></Link></li>
              </ul>
            </div>
            <div className="coll">
              <h4>Travelling with children</h4>
              <p>Short walks, calm water, and somewhere to dry everything out.</p>
              <ul>
                <li><Link href="/tofino/beaches"><span>Tinwis Beach</span><span>sheltered</span></Link></li>
                <li><Link href="/tofino/whale-watching"><span>Covered whale boats</span><span>ages 5+</span></Link></li>
                <li><Link href="/tofino#planning"><span>Campgrounds</span><span>both towns</span></Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <div className="rowhead">
            <div><h2 className="t-h2">Every destination</h2></div>
          </div>
          <div className="dest-cards">
            {rows.map((r) =>
              r.navigable && r.city ? (
                <Link key={r.destination.slug} className="dcard" href={`/${r.destination.slug}`}>
                  <Image src={cld(r.city.heroPublicId, { w: 640, h: 512, fit: "fill" })} alt={r.city.name} width={640} height={512} sizes="(max-width: 720px) 50vw, 25vw" />
                  <div className="dcard__scrim" aria-hidden="true" />
                  <div className="dcard__body">
                    <p className="dcard__name t-bold-20">{r.city.name}</p>
                    <p className="dcard__meta t-med-14">{r.destination.region} &middot; {r.guideCount} guides</p>
                  </div>
                </Link>
              ) : (
                <span key={r.destination.slug} className="dcard dcard--soon">
                  <Image src={cld(r.destination.heroPublicId, { w: 640, h: 512, fit: "fill" })} alt="" width={640} height={512} sizes="(max-width: 720px) 50vw, 25vw" style={{ filter: "grayscale(1)" }} />
                  <div className="dcard__scrim" aria-hidden="true" />
                  <div className="dcard__body">
                    <p className="dcard__name t-bold-20">{r.destination.name}</p>
                    <p className="dcard__meta t-med-14">Coming soon</p>
                  </div>
                </span>
              ),
            )}
          </div>
          <div className="softnote" style={{ marginTop: 20 }}>
            <b>Structural note.</b> Coming-soon destinations are shown but are not links, so the page grows with the
            business without ever leading somewhere empty. There is no region page between here and a destination.
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
