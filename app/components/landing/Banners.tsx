import Image from "next/image";
import { cld, IMG } from "@/app/lib/cloudinary";

/** "List your accommodation" full-bleed banner. */
export function ListYourAccommodation() {
  return (
    <section className="container section">
      <div className="banner">
        <Image src={cld(IMG.cabinExterior, { w: 2000, fit: "limit" })} alt="" width={2000} height={688} sizes="100vw" />
        <div className="banner__scrim" aria-hidden="true" />
        <div className="banner__content">
          <h2 className="t-h1" style={{ color: "#fff" }}>List your accommodation. Host with confidence on ArcTrips.</h2>
          <button className="btn btn--white" type="button">Become a host</button>
        </div>
      </div>
    </section>
  );
}

/** Navy "Find a stay you'll feel good about" CTA band. */
export function FindAStayBand() {
  return (
    <section className="container section">
      <div className="cta-band">
        <h2 className="t-h2" style={{ color: "#fff" }}>Find a stay you&rsquo;ll feel good about.</h2>
        <button className="btn btn--white" type="button">Browse accommodations</button>
      </div>
    </section>
  );
}
