export type FaqItem = { q: string; a: string };

/** Static accordion, no JS: <details>/<summary> styled to match .faq__q/.faq__a. */
export function FaqList({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;
  return (
    <div className="faq">
      {faqs.map((faq) => (
        <details className="faq__item" key={faq.q}>
          <summary className="faq__q">{faq.q}</summary>
          <p className="faq__a">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
