import Link from "next/link";

/**
 * The one section header used across every template.
 *
 * The templates previously hand-rolled `.rowhead` and `.rail__head` with
 * inline margins, and those headings sat at 19px against a 40px page title,
 * so every page read as a flat stack with no middle tier. This restores that
 * tier and takes the spacing decision out of the templates.
 *
 * `ruled` adds the system's 1.5px ink rule (`.sechead--ruled`). Prefer it: a
 * band opened by a rule needs no bordered container beneath it, which is how
 * the tree pages stopped being a stack of boxes.
 */
export function SectionHead({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  ruled = false,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  ruled?: boolean;
  as?: "h2" | "h3";
}) {
  return (
    <div className={ruled ? "sechead sechead--ruled" : "sechead"}>
      <div>
        {eyebrow && <span className="sechead__eyebrow">{eyebrow}</span>}
        <Tag>{title}</Tag>
        {description && <p>{description}</p>}
      </div>
      {actionHref && actionLabel && (
        <Link className="sechead__action" href={actionHref}>{actionLabel}</Link>
      )}
    </div>
  );
}
