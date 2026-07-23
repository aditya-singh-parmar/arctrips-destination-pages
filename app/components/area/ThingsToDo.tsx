import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";
import type { ThingToDo } from "@/app/lib/content";

export function ThingsToDo({ things }: { things: ThingToDo[] }) {
  if (!things.length) return null;
  return (
    <div className="things">
      {things.map((t) => (
        <div className="thing" key={t.label}>
          <Image src={cld(t.heroPublicId, { w: 600, h: 600, fit: "fill" })} alt={t.label} width={600} height={600} sizes="(max-width: 900px) 50vw, 25vw" />
          <div className="thing__scrim" aria-hidden="true" />
          <div className="thing__label">
            <p className="t-bold-16">{t.label}</p>
            <p className="t-reg-12">{t.blurb}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
