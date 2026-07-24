import Image from "next/image";
import Link from "next/link";
import { cld } from "@/app/lib/cloudinary";
import type { Destination } from "@/app/lib/content";
import { IconArrow } from "@/app/components/ui/Icons";

export function ExploreDestinations({ destinations, navigable = [] }: { destinations: Destination[]; navigable?: string[] }) {
  return (
    <section className="container section">
      <div className="rowhead">
        <h2 className="t-h2">Explore destinations</h2>
        <div className="rowhead__arrows">
          <button className="arrow" aria-label="Previous"><IconArrow width={20} height={20} style={{ transform: "rotate(180deg)" }} /></button>
          <button className="arrow arrow--filled" aria-label="Next"><IconArrow width={20} height={20} /></button>
        </div>
      </div>
      <div className="dests">
        {destinations.map((d) => {
          const ready = navigable.includes(d.slug);
          const inner = (
            <>
              <div className="dest__media">
                <Image
                  src={cld(d.heroPublicId, { w: 412, h: 352, fit: "fill" })}
                  alt={d.name}
                  width={412}
                  height={352}
                  sizes="(max-width: 620px) 50vw, 20vw"
                />
              </div>
              <p className="dest__name t-bold-16">{d.name}</p>
              <p className="dest__meta t-med-12">
                {d.comingSoon ? "(Coming soon)" : `${d.listingCount} listings`}
              </p>
            </>
          );
          return ready ? (
            <Link key={d.slug} href={`/${d.slug}`}>{inner}</Link>
          ) : (
            <div key={d.slug}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
