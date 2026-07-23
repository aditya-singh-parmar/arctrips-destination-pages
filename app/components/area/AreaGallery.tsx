import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";

export function AreaGallery({ publicIds }: { publicIds: string[] }) {
  if (!publicIds.length) return null;
  return (
    <div className="area-gallery">
      {publicIds.map((id, i) => (
        <Image key={i} src={cld(id, { w: 640, h: 480, fit: "fill" })} alt="" width={640} height={480} sizes="(max-width: 700px) 50vw, 33vw" />
      ))}
    </div>
  );
}
