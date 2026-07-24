"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLocation } from "@/app/components/ui/Icons";

/**
 * Standalone search field styled to match the mockup's `.srch` pill. Kept
 * out of `TopNav.tsx` (legacy, do not modify): pages that want it render it
 * directly next to the nav. Navigates to `/destinations` with a `q` param;
 * wiring that param up to real results is out of scope here.
 */
export function DestinationSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/destinations?q=${encodeURIComponent(q)}` : "/destinations");
  }

  return (
    <form onSubmit={onSubmit} className="searchfield" style={{ maxWidth: 260 }} role="search">
      <IconLocation aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Where do you want to go?"
        aria-label="Search destinations"
        style={{ border: 0, outline: "none", background: "transparent", font: "inherit", color: "inherit", width: "100%" }}
      />
    </form>
  );
}
