const STEPS = [
  { n: 1, title: "Discover verified stays", text: "Browse hand-picked accommodations with clear photos, honest descriptions, and upfront pricing." },
  { n: 2, title: "Book with confidence", text: "Secure your stay with transparent policies, safe payments, and no hidden fees." },
  { n: 3, title: "Support you can trust", text: "Real, human support before, during, and after your stay." },
];

export function HowItWorks() {
  return (
    <section className="container section">
      <div className="steps">
        <h2 className="steps__title t-h1">How it works.</h2>
        <div className="steps__grid">
          {STEPS.map((s) => (
            <div className="step" key={s.n}>
              <div className="step__num">{s.n}</div>
              <p className="step__title t-bold-18">{s.title}</p>
              <p className="step__text t-reg-16">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
