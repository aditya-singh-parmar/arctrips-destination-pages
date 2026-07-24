import Link from "next/link";

export type ThemeGridGroup = {
  title: string;
  /** Short descriptor line, e.g. "13 beaches, 9 trails". */
  count: string;
  items: string[];
  moreLabel?: string;
  moreHref?: string;
};

/**
 * "{City} is great for" 3-column grid. Only rendered by the page once a
 * city's category count exceeds `THEME_GRID_THRESHOLD` (10): that check
 * belongs to the page, not here; this component just renders what it's given.
 */
export function ThemeGrid({ groups }: { groups: ThemeGridGroup[] }) {
  return (
    <div className="themegrid">
      {groups.map((group) => (
        <div className="themegrid__card" key={group.title}>
          <h4>{group.title}</h4>
          <div className="themegrid__count">{group.count}</div>
          <ol>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          {group.moreLabel && group.moreHref && (
            <Link href={group.moreHref} className="themegrid__more">
              {group.moreLabel} &rarr;
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
