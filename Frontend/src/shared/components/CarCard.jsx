import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Badge } from "./Badge.jsx";
import { SoldRibbon, SoldSrLabel } from "./SoldRibbon.jsx";
import { FavoriteButton } from "./FavoriteButton.jsx";
import {
  CarSilhouetteIcon,
  GaugeIcon,
  MapPinIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons.jsx";

import {
  carLocation,
  carTitle,
  formatMileage,
  formatPrice,
  getPrimaryImage,
} from "../utils/format.js";

import { optimizedImageUrl, buildSrcSet } from "../utils/imagekit.js";

// Compact cards show the currency symbol in front of the amount ("$ 27,000").
const PREFIX_CURRENCIES = { USD: "$", EUR: "€" };

const compactPrice = (price, currency = "USD") => {
  if (price === undefined || price === null) return "—";
  const amount = new Intl.NumberFormat("en-US").format(price);
  const prefix = PREFIX_CURRENCIES[currency] || currency || "";
  return `${prefix} ${amount}`.trim();
};

/**
 * variant="default" — the original card (used by Home, Search, Favorites…).
 * variant="compact" — smaller listing card: price first, then title, then a
 *                     single "KM · Location" line. Used by the catalog tabs.
 */
export const CarCard = ({
  car,
  premium = false,
  sponsored = false,
  variant = "default",
}) => {
  const compact = variant === "compact";
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const imageUrls = (car?.images || []).map((img) => img?.url).filter(Boolean);

  const image = imageUrls[activeImageIndex] || getPrimaryImage(car);

  const mileage = formatMileage(car.mileage, car.mileageUnit);

  const location = carLocation(car);
  const imageTotal = imageUrls.length;
  const showImageNavigation = imageTotal > 1;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [car?._id]);

  const handlePrevious = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveImageIndex((current) =>
      current === 0 ? imageUrls.length - 1 : current - 1,
    );
  };

  const handleNext = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveImageIndex((current) =>
      current === imageUrls.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <Link
      to={`/cars/${car._id}`}
      className={clsx(
        "group flex h-full flex-col overflow-hidden",
        compact ? "rounded-xl" : "rounded-2xl",
        "border border-card bg-card",
        premium && "border-brass/20",
        "shadow-card",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-brass/40",
        "hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-brass/50",
      )}
    >
      {/* IMAGE */}
      <div
        className={clsx(
          "relative overflow-hidden bg-graphite-100",
          compact ? "aspect-[16/10]" : "aspect-[4/3]",
        )}
      >
        {image ? (
          <img
            src={optimizedImageUrl(image, {
              width: 480,
            })}
            srcSet={buildSrcSet(image)}
            sizes={
              compact
                ? "(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 90vw"
                : "(min-width: 1280px) 300px, (min-width: 640px) 45vw, 90vw"
            }
            alt={carTitle(car)}
            loading="lazy"
            decoding="async"
            width={480}
            height={compact ? 300 : 360}
            className={clsx(
              "h-full w-full object-cover",
              "transition-transform duration-700 ease-out",
              "group-hover:scale-[1.045]",
              car.isSold && "grayscale-[35%] opacity-90",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-steel">
            <CarSilhouetteIcon className="h-10 w-16" />
          </div>
        )}

        {/* Image bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 via-black/5 to-transparent opacity-70" />

        <SoldRibbon sold={car.isSold} />
        <SoldSrLabel sold={car.isSold} />

        {/* Image navigation */}
        {showImageNavigation && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              aria-label="View previous image"
              className="absolute left-2.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/75 text-graphite opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-white active:scale-95 sm:left-3"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="View next image"
              className="absolute right-2.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/75 text-graphite opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-white active:scale-95 sm:right-3"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Image count */}
        {imageTotal > 0 && (
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/35 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-md">
            <CameraIcon className="h-3.5 w-3.5" />
            {imageTotal}
          </div>
        )}

        {/* Featured */}


        {/* Favorite */}
        <FavoriteButton
          carId={car._id}
          size="sm"
          className="absolute right-3 top-3 z-10 border border-white/40 bg-white/75 shadow-lg backdrop-blur-md"
        />
      </div>

      {/* CONTENT */}
      {compact ? (
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <p className="font-display text-xl font-bold leading-tight text-brass-dark">
            {compactPrice(car.price, car.currency)}
          </p>

          <h3 className="mt-1.5 truncate font-display text-base font-bold leading-snug text-card">
            {carTitle(car)}
          </h3>

          {(mileage || location) && (
            <p className="mt-1 truncate text-xs text-ash">
              {[mileage?.toUpperCase(), location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ) : (
        <div className={clsx("flex flex-1 flex-col p-4 sm:p-5")}>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold leading-snug text-card">
              {carTitle(car)}
            </h3>

            <p className="mt-1.5 font-mono text-base font-semibold text-brass-dark">
              {formatPrice(car.price, car.currency)}
            </p>
          </div>

          {(location || mileage) && (
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
              {location && (
                <span className="chip-glass">
                  <MapPinIcon className="h-3.5 w-3.5 text-ash" />
                  {location}
                </span>
              )}

              {mileage && (
                <span className="chip-glass">
                  <GaugeIcon className="h-3.5 w-3.5 text-ash" />
                  {mileage}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Link>
  );
};

export const CarCardGrid = ({ children, dense = false }) => (
  <div
    className={
      dense
        ? "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        : "grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
    }
  >
    {children}
  </div>
);

/**
 * CarCardRow — one horizontally scrollable row of cards (used for the
 * Sponsored section). Scrolls both ways with: touch swipe, trackpad /
 * shift+wheel, mouse click-and-drag, and the left/right arrow buttons.
 * Must sit inside a `.container-listing` (it bleeds into that padding).
 */
export const CarCardRow = ({ children, label = "Vehicles" }) => {
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 });

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller) return undefined;

    updateEdges();
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);

    // Re-check when the viewport OR the amount of content changes.
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateEdges);
      observer.observe(scroller);
      if (track) observer.observe(track);
    }

    return () => {
      scroller.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
      observer?.disconnect();
    };
  }, [updateEdges]);

  const scrollByPage = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  // Mouse drag only — touch and pen use the browser's native scrolling.
  const handlePointerDown = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startLeft: el.scrollLeft,
    };
  };

  const handlePointerMove = (event) => {
    const state = drag.current;
    const el = scrollerRef.current;
    if (!state.active || !el) return;

    const deltaX = event.clientX - state.startX;
    if (!state.moved) {
      if (Math.abs(deltaX) < 6) return; // still a click, not a drag
      state.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    el.scrollLeft = state.startLeft - deltaX;
  };

  const endDrag = (event) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // A drag must not be treated as a click on the card underneath.
  const handleClickCapture = (event) => {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  };

  const arrowClass =
    "absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full glass-panel-strong text-bone shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 sm:flex";

  return (
    <div className="relative">
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label={`Scroll ${label} left`}
          className={clsx(arrowClass, "left-1")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      )}

      {canRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label={`Scroll ${label} right`}
          className={clsx(arrowClass, "right-1")}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        onDragStart={(event) => event.preventDefault()}
        className={clsx(
          "no-scrollbar -mx-3 overflow-x-auto overscroll-x-contain scroll-pl-3 sm:-mx-4 sm:scroll-pl-4 lg:-mx-5 lg:scroll-pl-5",
          dragging ? "cursor-grabbing snap-none" : "snap-x snap-proximity",
        )}
      >
        <div
          ref={trackRef}
          className="flex w-max gap-3 px-3 pb-4 pt-1 sm:gap-4 sm:px-4 lg:px-5"
        >
          {Children.map(children, (child) => (
            <div className="flex w-[250px] shrink-0 snap-start sm:w-[270px] lg:w-[290px] [&>*]:min-w-0 [&>*]:flex-1">
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
