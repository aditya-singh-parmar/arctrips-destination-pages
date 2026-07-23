import Image from "next/image";
import Link from "next/link";
import { cld } from "@/app/lib/cloudinary";
import type { Article } from "@/app/lib/content";

export function GuidesGrid({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <div className="guides">
      {articles.map((a) => (
        <Link className="guide" key={a.slug} href={`/destinations/${a.destinationSlug}/guides/${a.slug}`}>
          <div className="guide__media">
            <Image src={cld(a.heroPublicId, { w: 640, h: 400, fit: "fill" })} alt={a.title} width={640} height={400} sizes="(max-width: 560px) 100vw, 33vw" />
          </div>
          <div className="guide__body">
            <span className="guide__cat t-med-12">{a.category}</span>
            <h3 className="guide__title t-bold-18">{a.title}</h3>
            <p className="guide__excerpt t-reg-14">{a.excerpt}</p>
            <span className="guide__more t-med-14">Read guide</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
