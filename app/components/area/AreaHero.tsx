import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";

export function AreaHero({ name, region, standfirst, heroPublicId }: {
  name: string; region: string; standfirst: string; heroPublicId: string;
}) {
  return (
    <div className="area-hero">
      <Image src={cld(heroPublicId, { w: 2000, fit: "limit" })} alt={`${name}, ${region}`} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
      <div className="area-hero__scrim" aria-hidden="true" />
      <div className="area-hero__inner">
        {region ? <p className="area-hero__kicker t-med-14">{region}</p> : null}
        <h1 className="t-h0" style={{ color: "#fff" }}>{name}</h1>
        {standfirst ? <p className="area-hero__lead t-reg-16">{standfirst}</p> : null}
      </div>
    </div>
  );
}
