import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../../i18n/optionLabels.js";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import {
  fetchCarById,
  fetchSimilarCars,
} from "../../../services/cars/carsApi.js";
import { ImageGallery } from "./ImageGallery.jsx";
import { SpecsGrid } from "./SpecsGrid.jsx";
import { Badge } from "../../../shared/components/Badge.jsx";
import { CarSection } from "../../../shared/components/CarSection.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
import { SellerCard } from "../../../shared/components/SellerCard.jsx";
import { FeaturesList } from "../../../shared/components/FeaturesList.jsx";
import { FavoriteButton } from "../../../shared/components/FavoriteButton.jsx";
import {
  carLocation,
  carTitle,
  formatPrice,
} from "../../../shared/utils/format.js";
import {
  MapPinIcon,
  ChevronLeftIcon,
  ClipboardCheckIcon,
  CommentIcon,
  LayersIcon,
} from "../../../shared/components/icons.jsx";

export default function CarDetailsPage() {
  const { t } = useTranslation("catalog");
  const label = useOptionLabel();
  const { id } = useParams();

  const carFetcher = useCallback(() => fetchCarById(id), [id]);
  const {
    data: car,
    error: carError,
    loading: carLoading,
    refetch,
  } = useAsyncData(carFetcher, [id]);
  const { options } = useCarOptions();

  const similarFetcher = useCallback(() => {
    if (!car) return Promise.resolve({ cars: [] });
    return fetchSimilarCars(id);
  }, [id, car]);
  const {
    data: similarData,
    error: similarError,
    loading: similarLoading,
    refetch: refetchSimilar,
  } = useAsyncData(similarFetcher, [id, !!car]);

  if (carLoading) {
    return (
      <div className="container-listing pb-10 pt-28 sm:pb-14 sm:pt-32">
        <Skeleton className="h-4 w-24 mb-6" />
        <div className="grid lg:grid-cols-2 gap-10">
          <Skeleton className="aspect-[4/3] sm:aspect-[16/10] w-full rounded-premium-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (carError) {
    const isNotFound = carError.status === 404;
    return (
      <div className="container-listing pb-16 pt-28 sm:pt-32">
        <ErrorState
          title={
            isNotFound ? t("details.notFoundTitle") : t("details.loadErrorTitle")
          }
          description={
            isNotFound
              ? t("details.notFoundDescription")
              : carError.message
          }
          onRetry={isNotFound ? undefined : refetch}
        />
        <div className="text-center">
          <Link
            to="/listings"
            className="text-brass-dark text-sm font-semibold"
          >
            <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
              ←
            </span>{" "}
            {t("details.back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!car) return null;

  const location = carLocation(car);

  return (
    <div>
      <div className="container-listing pb-8 pt-28 sm:pb-10 sm:pt-32">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>
            {/* Toolbar above the gallery: back button at the start,
                favorite heart at the end — balanced on all viewports
                and RTL-aware. */}
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/listings"
                aria-label={t("details.back")}
                title={t("details.back")}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-card bg-white/70 text-ash shadow-sm backdrop-blur transition-all hover:text-brass-dark hover:border-brass/40 hover:bg-white hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </Link>
              <FavoriteButton carId={car._id} className="shadow-lg" />
            </div>
            <div className="relative">
              <ImageGallery images={car.images} title={carTitle(car)} />
            </div>

            {/* Specification section — spec requirement #15: placed
                directly below the image gallery, not mixed into the
                right-column narrative text. */}
            <div className="mt-8 glass-panel rounded-premium-lg p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brass/20 bg-brass/10 text-brass-dark">
                  <ClipboardCheckIcon className="h-[18px] w-[18px]" />
                </span>
                <h2 className="font-display text-lg font-semibold text-bone">
                  {t("details.specification")}
                </h2>
              </div>
              <SpecsGrid car={car} />
            </div>
          </div>

          {/* Mobile order: name → price → primary info → description →
              features → seller. Price panel is intentionally placed right after the title on all
              breakpoints since it's the first thing a buyer looks for. */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {car.isSold && (
                <Badge variant="danger">{t("sold.label", { ns: "common" })}</Badge>
              )}
              {car.featured && (
                <Badge variant="brass">{t("details.featured")}</Badge>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-bone leading-tight">
              {carTitle(car)}
            </h1>

            {location && (
              <p className="flex items-center gap-1.5 text-ash text-sm mt-2">
                <MapPinIcon className="w-4 h-4" />
                {location}
              </p>
            )}

            <div className="mt-6 glass-panel rounded-premium-lg px-6 py-5">
              <p className="font-mono text-4xl text-brass-dark font-semibold">
                {formatPrice(car.price, car.currency)}
              </p>
            </div>

            {car.description && (
              <div className="mt-8 glass-panel rounded-premium-lg p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brass/20 bg-brass/10 text-brass-dark">
                    <CommentIcon className="h-[18px] w-[18px]" />
                  </span>
                  <h2 className="font-display text-lg font-semibold text-bone">
                    {t("details.description")}
                  </h2>
                </div>
                <p className="text-ash text-sm leading-relaxed whitespace-pre-line">
                  {car.description}
                </p>
              </div>
            )}

            <FeaturesList
              featureGroups={options?.featureGroups}
              selectedFeatures={car.features}
            />

            <SellerCard car={car} />
          </div>
        </div>
      </div>

      {similarData?.cars?.length > 0 && (
        <div className="border-t border-card bg-white">
          <CarSection
            containerClassName="container-listing"
            dense
            eyebrowBelow
            icon={LayersIcon}
            eyebrow={t("details.similarEyebrow")}
            title={t("details.similarTitle")}
            cars={similarData.cars}
            loading={similarLoading}
            error={similarError}
            onRetry={refetchSimilar}
            emptyMessage={t("details.similarEmpty")}
          />
        </div>
      )}
    </div>
  );
}
