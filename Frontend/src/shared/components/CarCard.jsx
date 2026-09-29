import { useEffect, useState } from "react";
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

export const CarCard = ({ car, premium = false, sponsored = false }) => {
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
        "rounded-2xl border border-card bg-card",
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
      <div className="relative aspect-[4/3] overflow-hidden bg-graphite-100">
        {image ? (
          <img
            src={optimizedImageUrl(image, {
              width: 480,
            })}
            srcSet={buildSrcSet(image)}
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 90vw"
            alt={carTitle(car)}
            loading="lazy"
            decoding="async"
            width={480}
            height={360}
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
    </Link>
  );
};

export const CarCardGrid = ({ children }) => (
  <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
    {children}
  </div>
);
