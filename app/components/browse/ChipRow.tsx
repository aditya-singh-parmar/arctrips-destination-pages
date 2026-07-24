import Link from "next/link";

export type Chip = { label: string; href?: string; active?: boolean };

/** Plain pill filter row, replaces a sidebar for facets ("Essentials", "On the water", ...). */
export function ChipRow({ items }: { items: Chip[] }) {
  return (
    <div className="chiprow">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href ?? "#"}
          className={item.active ? "chip chip--on" : "chip"}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
