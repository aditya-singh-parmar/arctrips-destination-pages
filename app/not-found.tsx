import Image from "next/image";
import Link from "next/link";
import { getDestinations, getGuidesForCity } from "@/app/lib/content";
import { pathForTownSlug } from "@/app/lib/geo";
import { cld } from "@/app/lib/cloudinary";
import { TopNav } from "@/app/components/landing/TopNav";
import { Footer } from "@/app/components/landing/Footer";

export const metadata = { title: "Page not found | Arc Trips", robots: { index: false, follow: true } };

/**
 * Never a dead end (spec section 6). A 404 carries a way onward: the search
 * entry point in the nav, plus the destinations we actually publish. Returns
 * HTTP 404, which is the point: a soft 404 answering 200 is the specific
 * failure this page exists to prevent.
 */
export default async function NotFound() {
  const destinations = await getDestinations();
  const rows = await Promise.all(
    destinations.map(async (d) => {
      const guides = await getGuidesForCity(d.slug);
      return guides.length ? { d, path: await pathForTownSlug(d.slug), guides: guides.length } : null;
    }),
  );
  const live = rows.filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <>
      <TopNav active="destinations" />
      <div className="container">
        <div className="section">
          <h1 className="t-h1">We could not find that page</h1>
          <p className="t-reg-14" style={{ marginTop: 8, maxWidth: "58ch" }}>
            The link may be out of date, or the page may not be published yet. Search from the bar above, or
            start from a destination we know properly.
          </p>
          <p style={{ marginTop: 18 }}>
            <Link className="btn btn--primary" href="/destinations">Browse all destinations</Link>
          </p>
        </div>

        {live.length > 0 && (
          <div className="section" style={{ paddingTop: 0 }}>
            <div className="rowhead">
              <div><h2 className="t-h2">Where people go</h2></div>
            </div>
            <div className="dest-cards">
              {live.map(({ d, path, guides }) => (
                <Link key={d.slug} className="dcard" href={path}>
                  <Image
                    src={cld(d.heroPublicId, { w: 640, h: 512, fit: "fill" })}
                    alt={d.name}
                    width={640}
                    height={512}
                    sizes="(max-width: 720px) 50vw, 25vw"
                  />
                  <div className="dcard__scrim" aria-hidden="true" />
                  <div className="dcard__body">
                    <p className="dcard__name t-bold-20">{d.name}</p>
                    <p className="dcard__meta t-med-14">{guides} guides</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
