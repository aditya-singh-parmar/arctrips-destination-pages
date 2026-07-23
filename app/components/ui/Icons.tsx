import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconLocation = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21c4-4 7-7.5 7-11a7 7 0 1 0-14 0c0 3.5 3 7 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconBed = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 18V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9" /><path d="M3 14h18" /><path d="M3 18v2M21 18v2" /></svg>
);
export const IconRooms = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 21V5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v16" /><path d="M16 8h4a1 1 0 0 1 1 1v12" /><path d="M2 21h20" /><path d="M12 12h.01" /></svg>
);
export const IconBath = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2" /><path d="M8 7h.01" /><path d="M3 12h18v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-2Z" /><path d="M7 18l-1 2M17 18l1 2" /></svg>
);
export const IconStar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}><path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.6 9.1l5.8-.8L12 3Z" /></svg>
);
export const IconHeart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} viewBox="0 0 24 24"><path d="M12 20s-7-4.5-9.3-9C1.2 8 2.6 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.4 0 4.8 3.5 3.3 6.5C19 15.5 12 20 12 20Z" /></svg>
);
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5M21 20a6 6 0 0 0-4-5.6" /></svg>
);
export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })} viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z" /></svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></svg>
);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IconTag = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
);
export const IconKing = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 18v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M4 12V8l3 2 5-4 5 4 3-2v4" /><path d="M4 18h16v2H4z" /></svg>
);
export const IconDollar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.9-2.5 2s1.1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5" /></svg>
);
export const IconHelp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 1.8-2 3M12 17h.01" /></svg>
);
