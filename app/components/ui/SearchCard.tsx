"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type SearchItem = {
  /** What the reader typed to find, e.g. "Long Beach". */
  label: string;
  /** The quiet right-hand note, e.g. "Tofino place". */
  sub: string;
  href: string;
};

const MIN_CHARS = 2;
const MAX_ROWS = 8;

/**
 * The white search card that overlaps the base of the hero banner, in the
 * shape of the live site's search bar.
 *
 * It searches the index the page already loaded, and every row is a direct
 * link to a real page, so there is no results page to build and no query that
 * can return a blank screen. Pressing the slash key from anywhere on the page
 * puts the cursor in it, which is the one keyboard shortcut a browse surface
 * earns.
 *
 * This renders on the server too, so the field, the button and the note are
 * all in the initial HTML; only the filtering needs the client.
 */
export function SearchCard({
  items,
  placeholder = "Search destinations, guides, places",
  note = "Searches every destination and guide we publish.",
}: {
  items: SearchItem[];
  placeholder?: string;
  note?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const term = q.trim().toLowerCase();
  const matches =
    term.length < MIN_CHARS
      ? []
      : items
          .filter((i) => i.label.toLowerCase().includes(term) || i.sub.toLowerCase().includes(term))
          .slice(0, MAX_ROWS);
  const showList = open && term.length >= MIN_CHARS;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches[0]) router.push(matches[0].href);
  }

  return (
    <div className="searchcard">
      <form className="searchrow" onSubmit={onSubmit} role="search">
        <label className="sfield">
          <span className="sr-only">Search</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            name="q"
            value={q}
            autoComplete="off"
            placeholder={placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showList}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          />
        </label>
        <button className="btn btn--primary" type="submit">Search</button>
      </form>

      {showList && (
        <div className="ta" id={listId} role="listbox">
          {matches.length === 0 ? (
            <p className="ta__none">Nothing yet for &ldquo;{q.trim()}&rdquo;</p>
          ) : (
            matches.map((m) => (
              <Link key={m.href} href={m.href} role="option" aria-selected="false">
                <b>{m.label}</b>
                <span>{m.sub}</span>
              </Link>
            ))
          )}
        </div>
      )}

      <p className="searchnote">{note}</p>
    </div>
  );
}
