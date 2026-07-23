import { IconKing, IconTag, IconCheck, IconHelp } from "@/app/components/ui/Icons";

const CARDS = [
  { icon: IconKing, name: "Premium stays", text: "Every property is vetted for safety, comfort, and reliability." },
  { icon: IconTag, name: "Transparent pricing", text: "No hidden fees. What you see is what you pay." },
  { icon: IconCheck, name: "Easy check-in", text: "Clear instructions and smooth arrivals without stress." },
  { icon: IconHelp, name: "Always here to help", text: "Real support from real people." },
];

export function PromiseCards() {
  return (
    <section className="container section">
      <h2 className="promise__title t-h1">Our promise of comfort and care.</h2>
      <div className="promise__grid">
        {CARDS.map((c) => (
          <div className="promise__card" key={c.name}>
            <span className="promise__icon"><c.icon width={40} height={40} /></span>
            <p className="promise__name t-h3" style={{ fontSize: 20, lineHeight: "28px" }}>{c.name}</p>
            <p className="promise__text t-reg-16">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
