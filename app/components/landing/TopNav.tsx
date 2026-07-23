import Link from "next/link";

export function TopNav() {
  return (
    <nav className="nav">
      <div className="container nav__inner">
        <Link href="/" className="nav__logo">ARCTRIPS</Link>
        <div className="nav__links">
          <Link href="/" className="nav__link">Home</Link>
          <Link href="/" className="nav__link" data-active="true">Accommodations</Link>
        </div>
        <div className="nav__right">
          <Link href="/" className="nav__list">List with us</Link>
          <Link href="/" className="btn btn--outline">Login/Sign up</Link>
        </div>
      </div>
    </nav>
  );
}
