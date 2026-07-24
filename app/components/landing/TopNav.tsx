import Link from "next/link";

/** `active` highlights the current top-level section. */
export function TopNav({ active = "accommodations" }: { active?: "accommodations" | "destinations" | "things-to-do" }) {
  return (
    <nav className="nav">
      <div className="container nav__inner">
        <Link href="/" className="nav__logo">ARCTRIPS</Link>
        <div className="nav__links">
          <Link href="/" className="nav__link">Home</Link>
          <Link href="/" className="nav__link" data-active={active === "accommodations"}>Accommodations</Link>
          <Link href="/destinations" className="nav__link" data-active={active === "destinations"}>Destinations</Link>
          <Link href="/things-to-do" className="nav__link" data-active={active === "things-to-do"}>Things to do</Link>
        </div>
        <div className="nav__right">
          <Link href="/" className="nav__list">List with us</Link>
          <Link href="/" className="btn btn--outline">Login/Sign up</Link>
        </div>
      </div>
    </nav>
  );
}
