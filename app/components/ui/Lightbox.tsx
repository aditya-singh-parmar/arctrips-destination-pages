"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cld } from "@/app/lib/cloudinary";

export type LightboxPhoto = { publicId: string; caption?: string };

/**
 * A gallery is the one place a modal is the right answer: the subject is the
 * photograph at size, and nothing else is competing for the screen.
 *
 * Prev/next, a counter, arrow keys and escape. Both entry points render their
 * thumbnails on the server, so the photographs are in the initial HTML and the
 * client work is only the viewer itself.
 */
function Viewer({
  photos,
  index,
  onClose,
  onStep,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, onStep]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label="Photographs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="lb__x" type="button" onClick={onClose} aria-label="Close" autoFocus>
        &times;
      </button>
      {photos.length > 1 && (
        <button className="lb__nav lb__nav--p" type="button" onClick={() => onStep(-1)} aria-label="Previous photograph">
          &#8249;
        </button>
      )}
      <figure className="lb__f">
        <Image
          src={cld(photo.publicId, { w: 1600, fit: "limit" })}
          alt={photo.caption ?? ""}
          width={1600}
          height={1100}
          sizes="100vw"
          unoptimized
        />
        <figcaption>
          {photo.caption && <span>{photo.caption}</span>}
          <b>{index + 1} of {photos.length}</b>
        </figcaption>
      </figure>
      {photos.length > 1 && (
        <button className="lb__nav lb__nav--n" type="button" onClick={() => onStep(1)} aria-label="Next photograph">
          &#8250;
        </button>
      )}
    </div>
  );
}

function useViewer(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + count) % count)),
    [count],
  );
  return { index, open: setIndex, close: () => setIndex(null), step };
}

/** The grid at the foot of a guide. Every frame opens the viewer at itself. */
export function GalleryGrid({ photos }: { photos: LightboxPhoto[] }) {
  const { index, open, close, step } = useViewer(photos.length);
  if (photos.length === 0) return null;

  return (
    <>
      <div className="gal">
        {photos.map((p, i) => (
          <figure key={`${p.publicId}-${i}`}>
            <button type="button" onClick={() => open(i)} aria-label={`Open photograph ${i + 1} of ${photos.length}`}>
              <Image
                src={cld(p.publicId, { w: 560, h: 420, fit: "fill" })}
                alt={p.caption ?? ""}
                width={560}
                height={420}
                sizes="(max-width: 700px) 50vw, 260px"
              />
            </button>
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
      {index !== null && <Viewer photos={photos} index={index} onClose={close} onStep={step} />}
    </>
  );
}

/**
 * One documented place's photograph, at the full width of the reading column.
 * Clicking it opens that place's own photographs, which is what the
 * place-tagged ingest is for.
 */
export function PlaceFigure({
  photos,
  alt,
  priority = false,
}: {
  photos: LightboxPhoto[];
  alt: string;
  priority?: boolean;
}) {
  const { index, open, close, step } = useViewer(photos.length);
  if (photos.length === 0) return null;
  const lead = photos[0];

  return (
    <>
      <figure className="place__m">
        <button type="button" onClick={() => open(0)} aria-label={`Open photographs of ${alt}`}>
          <Image
            src={cld(lead.publicId, { w: 1000, h: 625, fit: "fill" })}
            alt={alt}
            width={1000}
            height={625}
            sizes="(max-width: 820px) 100vw, 760px"
            priority={priority}
          />
          <span className="place__zoom">
            {photos.length > 1 ? `View ${photos.length} photographs` : "View photograph"}
          </span>
        </button>
      </figure>
      {index !== null && <Viewer photos={photos} index={index} onClose={close} onStep={step} />}
    </>
  );
}
