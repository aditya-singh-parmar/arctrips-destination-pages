import Image from "next/image";
import Link from "next/link";

/**
 * The five top-level sections, as settled: Home, Stays, Destinations,
 * About Us, Fishing.
 *
 * "Things to do" is deliberately not here. It is a section of the
 * destinations page, not a parallel branch of the site: a subject has one
 * home, and putting it in the nav implied a second one.
 */
const LINKS: { href: string; label: string; key: NavSection }[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/", label: "Stays", key: "stays" },
  { href: "/destinations", label: "Destinations", key: "destinations" },
  { href: "/", label: "About Us", key: "about" },
  { href: "https://arctripsfishing.com", label: "Fishing", key: "fishing" },
];

export type NavSection = "home" | "stays" | "destinations" | "about" | "fishing";

/** `active` highlights the current top-level section. */
export function TopNav({ active = "stays" }: { active?: NavSection }) {
  return (
    <nav className="nav">
      <div className="container nav__inner">
        <Link href="/" className="nav__logo">
          {/* alt is empty on purpose: the wordmark beside it already names the
              brand, so the link should announce once, not twice. */}
          <Image src="/brand/arctrips-mark-azure.svg" alt="" width={45} height={20} className="nav__mark" priority />
          <span>ARCTRIPS</span>
        </Link>
        <div className="nav__links">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="nav__link"
              data-active={active === l.key}
              {...(l.key === "fishing" ? { target: "_blank", rel: "noopener" } : {})}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav__right">
          <Link href="/" className="nav__list">List with us</Link>
          <Link href="/" className="btn btn--outline">Login/Sign up</Link>
        </div>
      </div>
    </nav>
  );
}
