import type { ArticleBlock, Photo, Place } from "@/app/lib/content";
import { ArticleBlocks } from "@/app/components/browse/ArticleBlocks";
import { PlaceFigure, type LightboxPhoto } from "@/app/components/ui/Lightbox";

/**
 * The documented places, as editorial entries.
 *
 * Each one is a photograph at the full width of the reading column with the
 * copy beneath it. Not a thumbnail, not a card, and not side by side: side by
 * side made the photographs too small to be worth having, which is the whole
 * reason the corpus was shot.
 *
 * "Good for" and "Good to know" are sentences under a hairline and a small
 * label, never a row of pills. The pill row was tried and rejected: it turned
 * researched detail into decoration.
 */
export function PlaceEntries({
  places,
  photos,
  categoryName,
}: {
  places: Place[];
  /** The guide's photographs, used to find each place's own frames by place_slug. */
  photos: Photo[];
  categoryName: string;
}) {
  if (places.length === 0) return null;

  return (
    <div className="plist">
      {places.map((place, i) => {
        const frames = framesFor(place, photos);
        const good = goodForSentence(place.goodFor);
        const body = withoutDuplicateLead(place.body, place.blurb);

        return (
          <article className="place" id={place.slug} key={place.id} style={{ scrollMarginTop: 88 }}>
            {frames.length > 0 && (
              <PlaceFigure photos={frames} alt={place.name} priority={i === 0} />
            )}
            <div className="place__b">
              <span className="place__i">
                {String(i + 1).padStart(2, "0")} of {places.length}
              </span>
              <h3>{place.name}</h3>
              {place.blurb && <p className="place__lead">{place.blurb}</p>}
              {body.length > 0 && (
                <div className="place__body">
                  <ArticleBlocks blocks={body} lead={false} />
                </div>
              )}
              {good && (
                <p className="place__good">
                  <span>Good for</span>
                  {good}
                </p>
              )}
              {place.goodToKnow && (
                <p className="place__note">
                  <span>Good to know</span>
                  {place.goodToKnow}
                </p>
              )}
            </div>
            <span className="sr-only">{categoryName}</span>
          </article>
        );
      })}
    </div>
  );
}

/**
 * A place's own photographs, hero first. Never falls back to the rest of the
 * guide's imagery: a viewer opened from Long Beach that shows Chesterman Beach
 * is worse than a viewer with one frame in it.
 */
function framesFor(place: Place, photos: Photo[]): LightboxPhoto[] {
  const tagged = photos
    .filter((p) => p.placeSlug === place.slug)
    .map((p) => ({ publicId: p.publicId, caption: p.caption }));
  if (!place.heroPublicId) return tagged;
  if (tagged.some((p) => p.publicId === place.heroPublicId)) {
    return [
      ...tagged.filter((p) => p.publicId === place.heroPublicId),
      ...tagged.filter((p) => p.publicId !== place.heroPublicId),
    ];
  }
  return [{ publicId: place.heroPublicId, caption: place.name }, ...tagged];
}

/**
 * The ingest leaked table headers into a few good-for lists, so a fragment
 * like "beach · location · best for" is dropped rather than printed as if a
 * person had written it. What survives is set as one sentence.
 */
const HEADER_FRAGMENT = /^(location|best for|beach|area|difficulty|notes?)$/i;

export function goodForSentence(goodFor: string[]): string | undefined {
  const parts = goodFor
    .filter((t) => !t.includes("·") && !HEADER_FRAGMENT.test(t.trim()))
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return `${parts[0]}.`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

/**
 * The blurb is promoted into the lead, and the ingest often repeats it as the
 * first body paragraph. Dropping the duplicate is what stops every place
 * opening with the same sentence twice.
 */
function withoutDuplicateLead(body: ArticleBlock[], blurb: string): ArticleBlock[] {
  if (!blurb) return body;
  const head = blurb.slice(0, 40);
  return body.filter((b) => !(b.type === "p" && b.text && b.text.slice(0, 60).includes(head.slice(0, 30))));
}
