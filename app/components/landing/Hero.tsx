import Image from "next/image";
import { cld, IMG } from "@/app/lib/cloudinary";
import { IconLocation, IconCalendar, IconUsers } from "@/app/components/ui/Icons";

export function Hero() {
  return (
    <section className="container" style={{ paddingTop: 24 }}>
      <div className="hero">
        <div className="hero__media">
          <Image
            src={cld(IMG.hero, { w: 1600, fit: "limit" })}
            alt="Find your perfect stay"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className="hero__scrim" aria-hidden="true" />
          <div className="hero__title"><h1 className="t-h0">Find your perfect stay.</h1></div>
        </div>

        <div className="searchbar">
          <div className="searchbar__row">
            <div className="searchfield">
              <IconLocation width={24} height={24} style={{ color: "var(--n-500)" }} />
              <span>Search destinations</span>
            </div>
            <div className="searchfield">
              <IconCalendar width={24} height={24} style={{ color: "var(--n-500)" }} />
              <span>Add check-in &amp; check-out dates</span>
            </div>
            <div className="searchfield">
              <IconUsers width={24} height={24} style={{ color: "var(--n-500)" }} />
              <span>Add guests</span>
            </div>
            <button className="btn btn--primary btn--search" type="button">Search</button>
          </div>
        </div>
      </div>
    </section>
  );
}
