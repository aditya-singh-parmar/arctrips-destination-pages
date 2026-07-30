import Image from "next/image";

const COLS = [
  {
    heading: "Support",
    links: ["Contact us", "Help centre", "Disability support", "Cancellation options", "Anti-discrimination"],
  },
  {
    heading: "Hosting",
    links: ["List your place", "Host responsibilities"],
  },
  {
    heading: "Why Arc Trips?",
    links: ["About us", "Privacy policy", "Cookies", "Terms and conditions", "Trust and safety", "Content guidelines"],
  },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__logo">
          <Image src="/brand/arctrips-mark-azure.svg" alt="" width={45} height={20} className="footer__mark" />
          <span>ArcTrips</span>
        </p>
        <div className="footer__cols">
          {COLS.map((col) => (
            <div className="footer__col" key={col.heading}>
              <h4>{col.heading}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className="footer__rule" />
        <p className="footer__copy">© 2025 copyrights</p>
      </div>
    </footer>
  );
}
