import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  CarSilhouetteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "../../../shared/components/icons.jsx";
import {
  optimizedImageUrl,
  buildSrcSet,
} from "../../../shared/utils/imagekit.js";

// Above this many photos, the mosaic caps at MOSAIC_TILE_COUNT tiles and the
// last one gets a "+N" overlay instead of trying to cram every photo in.
const MOSAIC_TILE_COUNT = 6;

export const ImageGallery = ({ images = [], title }) => {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightboxAt = (index) => {
    setActive(index);
    setLightboxOpen(true);
  };

  if (!images.length) {
    return (
      <div className="aspect-[4/3] sm:aspect-[16/10] bg-graphite-100 border border-card rounded-premium-lg flex items-center justify-center text-steel">
        <CarSilhouetteIcon className="w-24 h-14" />
      </div>
    );
  }

  // A single photo doesn't benefit from a mosaic — just show it full-size.
  if (images.length === 1) {
    return (
      <>
        <button
          type="button"
          onClick={() => openLightboxAt(0)}
          aria-label="View full-screen image"
          className="relative block w-full bg-graphite-100 border border-card rounded-premium-lg overflow-hidden aspect-[4/3] sm:aspect-[16/10] shadow-card cursor-zoom-in"
        >
          <img
            src={optimizedImageUrl(images[0]?.url, { width: 900 })}
            srcSet={buildSrcSet(images[0]?.url, [480, 640, 900, 1200])}
            sizes="(min-width: 1024px) 640px, 100vw"
            alt={title}
            loading="eager"
            decoding="async"
            className="w-full h-full object-contain mx-auto"
          />
        </button>

        {lightboxOpen && (
          <ImageLightbox
            images={images}
            title={title}
            active={active}
            onChangeActive={setActive}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  const visibleTiles = images.slice(0, MOSAIC_TILE_COUNT);
  const remainingCount = images.length - MOSAIC_TILE_COUNT;
  const showMoreOverlay = remainingCount > 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {visibleTiles.map((img, i) => {
          const isLastTile = showMoreOverlay && i === visibleTiles.length - 1;
          return (
            <button
              key={img.public_id || i}
              type="button"
              onClick={() => openLightboxAt(i)}
              aria-label={
                isLastTile
                  ? `View all ${images.length} photos`
                  : `View image ${i + 1} of ${images.length}`
              }
              className="relative aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-graphite-100 border border-card shadow-card cursor-zoom-in group"
            >
              <img
                src={optimizedImageUrl(img.url, { width: 480 })}
                srcSet={buildSrcSet(img.url, [320, 480, 640])}
                sizes="(min-width: 1024px) 300px, 45vw"
                alt={`${title} — image ${i + 1} of ${images.length}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />

              {isLastTile && (
                <div className="absolute inset-0 bg-graphite/60 flex items-center justify-center">
                  <span className="text-white font-display text-lg sm:text-xl font-semibold">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          title={title}
          active={active}
          onChangeActive={setActive}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Full-screen photo viewer. Covers the entire viewport, dims/hides the page
 * behind it, and lets the visitor step through every image for this car
 * with on-screen left/right arrows, the keyboard, or the bottom thumbnail
 * strip.
 */
const ImageLightbox = ({ images, title, active, onChangeActive, onClose }) => {
  const showNav = images.length > 1;

  const goPrev = useCallback(
    () =>
      onChangeActive((current) =>
        current === 0 ? images.length - 1 : current - 1,
      ),
    [images.length, onChangeActive],
  );

  const goNext = useCallback(
    () =>
      onChangeActive((current) =>
        current === images.length - 1 ? 0 : current + 1,
      ),
    [images.length, onChangeActive],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && showNav) goPrev();
      else if (event.key === "ArrowRight" && showNav) goNext();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, goPrev, goNext, showNav]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — full-screen photo viewer`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close full-screen view"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-200 hover:bg-white/25"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      {showNav && (
        <span className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 chip-glass !bg-white/15 !border-white/20 !text-white font-mono normal-case tracking-normal">
          {active + 1} / {images.length}
        </span>
      )}

      {showNav && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          aria-label="Previous image"
          className="absolute left-2 sm:left-6 top-1/2 z-20 flex h-11 w-11 sm:h-14 sm:w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-200 hover:bg-white/25 active:scale-95"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}

      <img
        src={optimizedImageUrl(images[active]?.url, { width: 1600 })}
        srcSet={buildSrcSet(images[active]?.url, [640, 900, 1200, 1600, 2000])}
        sizes="100vw"
        alt={`${title} — image ${active + 1} of ${images.length}`}
        decoding="async"
        className={clsx(
          "object-contain select-none max-w-[96vw]",
          showNav ? "max-h-[82vh] sm:max-h-[86vh]" : "max-h-[96vh]",
        )}
        onClick={(event) => event.stopPropagation()}
      />

      {showNav && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          aria-label="Next image"
          className="absolute right-2 sm:right-6 top-1/2 z-20 flex h-11 w-11 sm:h-14 sm:w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-200 hover:bg-white/25 active:scale-95"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      {showNav && (
        <div
          className="absolute bottom-3 sm:bottom-5 inset-x-0 z-20 flex justify-center px-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex gap-2 overflow-x-auto max-w-full py-1 px-1">
            {images.map((img, i) => (
              <button
                key={img.public_id || i}
                type="button"
                onClick={() => onChangeActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === active}
                className={clsx(
                  "shrink-0 w-14 h-10 sm:w-16 sm:h-12 rounded-lg overflow-hidden border-2 transition-all duration-200",
                  i === active
                    ? "border-brass shadow-sm"
                    : "border-white/20 opacity-70 hover:opacity-100",
                )}
              >
                <img
                  src={optimizedImageUrl(img.url, { width: 96 })}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
