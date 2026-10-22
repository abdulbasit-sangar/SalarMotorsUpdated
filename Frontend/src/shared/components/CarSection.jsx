import { Link } from "react-router-dom";
import { CarCard, CarCardGrid } from "./CarCard.jsx";
import { CarCardSkeleton } from "./Skeleton.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { ErrorState } from "./ErrorState.jsx";
import { CarSilhouetteIcon } from "./icons.jsx";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

export const CarSection = ({
  title,
  eyebrow,
  viewAllTo,
  cars,
  loading,
  error,
  onRetry,
  skeletonCount = 4,
  emptyMessage,
  dark = false,
  sponsored = false,
}) => {
  const { t } = useTranslation();
  return (
  <section className={clsx(dark ? "" : "container-page py-12 sm:py-16")}>
    <div className={clsx(dark && "container-page")}>
      <div className="flex items-end justify-between mb-8 sm:mb-10">
        <div>
          {eyebrow && (
            <p className="section-eyebrow">{eyebrow}</p>
          )}
          <h2
            className={clsx(
              "font-display text-3xl sm:text-4xl font-bold leading-tight",
              dark ? "text-bone" : "text-section-light",
            )}
          >
            {title}
          </h2>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className={clsx(
              "text-sm font-semibold transition-colors shrink-0 ms-4",
              dark
                ? "text-ash hover:text-brass"
                : "text-section-light-muted hover:text-brass",
            )}
          >
            {t("actions.viewAll")}{" "}
            <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
              →
            </span>
          </Link>
        )}
      </div>

      {error ? (
        <ErrorState onRetry={onRetry} />
      ) : loading ? (
        <CarCardGrid>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <CarCardSkeleton key={i} premium />
          ))}
        </CarCardGrid>
      ) : cars?.length ? (
        <CarCardGrid>
          {cars.map((car) => (
            <CarCard key={car._id} car={car} premium sponsored={sponsored} />
          ))}
        </CarCardGrid>
      ) : (
        <EmptyState
          icon={<CarSilhouetteIcon className="w-14 h-9" />}
          title={t("sections.noListingsTitle")}
          description={emptyMessage ?? t("sections.noListingsMessage")}
        />
      )}
    </div>
  </section>
  );
};
