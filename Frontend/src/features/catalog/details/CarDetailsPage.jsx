import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import { fetchCarById, fetchSimilarCars } from "../../../services/cars/carsApi.js";
import { ImageGallery } from "./ImageGallery.jsx";
import { SpecsGrid } from "./SpecsGrid.jsx";
import { Badge } from "../../../shared/components/Badge.jsx";
import { CarSection } from "../../../shared/components/CarSection.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
import { SellerCard } from "../../../shared/components/SellerCard.jsx";
import { FeaturesList } from "../../../shared/components/FeaturesList.jsx";
import { FavoriteButton } from "../../../shared/components/FavoriteButton.jsx";
import { carLocation, carTitle, formatPrice } from "../../../shared/utils/format.js";
import { MapPinIcon, ChevronLeftIcon } from "../../../shared/components/icons.jsx";

export default function CarDetailsPage() {
  const { id } = useParams();

  const carFetcher = useCallback(() => fetchCarById(id), [id]);
  const { data: car, error: carError, loading: carLoading, refetch } = useAsyncData(carFetcher, [id]);
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
      <div className="container-page py-10 sm:py-14">
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
      <div className="container-page py-16">
        <ErrorState
          title={isNotFound ? "Listing not found" : "Couldn't load this listing"}
          description={
            isNotFound
              ? "This car may have been sold, hidden, or the link is incorrect."
              : carError.message
          }
          onRetry={isNotFound ? undefined : refetch}
        />
        <div className="text-center">
          <Link to="/listings" className="text-brass-dark text-sm font-semibold">
            ← Back to all listings
          </Link>
        </div>
      </div>
    );
  }

  if (!car) return null;

  const location = carLocation(car);

  return (
    <div>
      <div className="container-page py-8 sm:py-10">
        <Link
          to="/listings"
          className="inline-flex items-center gap-1.5 text-ash hover:text-brass-dark text-sm font-medium mb-6 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to all listings
        </Link>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>
            <ImageGallery images={car.images} title={carTitle(car)} />

            {/* Specification section — spec requirement #15: placed
                directly below the image gallery, not mixed into the
                right-column narrative text. */}
            <div className="mt-8 glass-panel rounded-premium-lg p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-bone mb-4">
                Specification
              </h2>
              <SpecsGrid car={car} />
            </div>
          </div>

          {/* Mobile order: name → price → primary info → description →
              features → seller. Price panel is intentionally placed right after the title on all
              breakpoints since it's the first thing a buyer looks for. */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {car.isSold && <Badge variant="danger">Sold</Badge>}
                {car.steeringType && <Badge variant="glass">{car.steeringType}</Badge>}
                {car.featured && <Badge variant="brass">Featured</Badge>}
                {car.condition && <Badge variant="neutral">{car.condition}</Badge>}
              </div>
              <FavoriteButton carId={car._id} />
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
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold text-bone mb-2">
                  Description
                </h2>
                <p className="text-ash text-sm leading-relaxed whitespace-pre-line">
                  {car.description}
                </p>
              </div>
            )}

            <FeaturesList featureGroups={options?.featureGroups} selectedFeatures={car.features} />

            <SellerCard car={car} />
          </div>
        </div>
      </div>

      <div className="border-t border-card bg-graphite-100/60">
        <CarSection
          eyebrow="You may also like"
          title="Similar Listings"
          cars={similarData?.cars}
          loading={similarLoading}
          error={similarError}
          onRetry={refetchSimilar}
          emptyMessage="No similar listings found for this car yet."
        />
      </div>
    </div>
  );
}
