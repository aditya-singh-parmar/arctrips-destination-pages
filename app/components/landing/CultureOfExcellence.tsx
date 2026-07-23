import Image from "next/image";
import { cld, IMG } from "@/app/lib/cloudinary";
import { IconLocation, IconStar, IconCheck } from "@/app/components/ui/Icons";

const FEATURES = [
  { icon: IconCheck, title: "Easy check in", text: "Flexible, stress-free arrivals at every stay." },
  { icon: IconStar, title: "Reviews you can trust", text: "Verified guests, real feedback, no surprises." },
  { icon: IconLocation, title: "Listing that match", text: "We handle the details so you can focus on what matters." },
];

export function CultureOfExcellence() {
  return (
    <section className="container section">
      <div className="panel">
        <div>
          <h2 className="panel__title t-h2">Culture of excellence.</h2>
          <p className="panel__lead t-reg-16">
            Because we've lived the host and guide experience ourselves, we knew
            travelers and providers deserved a platform that simply works better.
          </p>
          {FEATURES.map((f) => (
            <div className="feat" key={f.title}>
              <span className="feat__icon"><f.icon width={24} height={24} /></span>
              <div>
                <p className="feat__title t-bold-16">{f.title}</p>
                <p className="feat__text t-reg-16">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="panel__media">
          <Image
            src={cld(IMG.curatedCabin, { w: 912, h: 848, fit: "fill" })}
            alt="Hosts welcoming guests"
            width={912}
            height={848}
            sizes="(max-width: 900px) 100vw, 456px"
          />
        </div>
      </div>
    </section>
  );
}
