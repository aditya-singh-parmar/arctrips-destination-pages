import Link from "next/link";

export type CrumbItem = { href?: string; label: string };

/**
 * Plain, non-interactive trail. No dropdowns: the owner rejected an earlier
 * version where breadcrumb segments were clickable menus, because the
 * control moved horizontally with URL depth. Only entries with an `href`
 * render as links; the final segment is always a plain, unlinked label.
 */
export function Breadcrumb({ trail }: { trail: CrumbItem[] }) {
  if (trail.length === 0) return null;
  return (
    <nav className="crumb" aria-label="Breadcrumb">
      {trail.map((item, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={`${item.label}-${i}`} style={{ display: "contents" }}>
            {i > 0 && <span className="crumb__sep">&rsaquo;</span>}
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <b>{item.label}</b>
            )}
          </span>
        );
      })}
    </nav>
  );
}
