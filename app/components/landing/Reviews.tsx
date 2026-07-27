import Image from "next/image";
import { cld } from "@/app/lib/cloudinary";
import type { Review } from "@/app/lib/content";
import { IconArrow, IconPlay } from "@/app/components/ui/Icons";

function Avatar({ review }: { review: Review }) {
  return (
    <span className="review__avatar" style={{ background: review.avatarColor }}>
      {review.authorInitial}
    </span>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="container section">
      <div className="reviews__head">
        <h2 className="t-h1">Real stories from real stays.</h2>
        <p className="reviews__sub">Authentic moments shared by guests who&rsquo;ve stayed, fished, and explored with us.</p>
      </div>
      <div className="masonry">
        {reviews.map((r) =>
          r.isFeatured && r.mediaPublicId ? (
            <div key={r.id} className="review review--media">
              <Image src={cld(r.mediaPublicId, { w: 828, h: 740, fit: "fill" })} alt={r.authorName} width={828} height={740} sizes="(max-width: 900px) 100vw, 33vw" />
              <span className="review__play" aria-hidden="true"><IconPlay width={48} height={48} style={{ color: "#fff" }} /></span>
              <div className="review__overlay">
                <p className="review__name t-bold-16" style={{ color: "#fff" }}>{r.authorName}</p>
                <p className="review__date t-med-14" style={{ color: "#fff" }}>{r.dated}</p>
                <p className="t-bold-16" style={{ color: "#fff", marginTop: 8 }}>&ldquo;{r.body}&rdquo;</p>
              </div>
            </div>
          ) : (
            <div key={r.id} className="review">
              <div className="review__head">
                <Avatar review={r} />
                <div>
                  <p className="review__name t-bold-16">{r.authorName}</p>
                  <p className="review__date t-med-14">{r.dated}</p>
                </div>
              </div>
              <p className="review__text t-reg-16">{r.body}</p>
            </div>
          ),
        )}
      </div>
      <div className="reviews__more">
        <button type="button"><span>Load more reviews</span><IconArrow width={16} height={16} style={{ transform: "rotate(90deg)" }} /></button>
      </div>
    </section>
  );
}
