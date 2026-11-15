import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CarCard,
  CarCardRow,
} from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";

// Promoted (featured) vehicles in the existing CarCardRow: swipe on phones,
// drag with the mouse, and left/right arrow buttons on tablets and desktops.
// The row already handles RTL direction, edge states and reduced motion.
export const PromotedCarousel = ({ cars, loading, error, onRetry }) => {
  const { t } = useTranslation("home");

  return (
    <section
      id="promoted"
      className="scroll-mt-20 bg-section-light py-14 sm:py-20"
    >
      <div className="container-listing">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="section-eyebrow">{t("promoted.eyebrow")}</p>
            <h2 className="section-title text-section-light">
              {t("promoted.title")}
            </h2>
            <p className="section-subtitle text-section-light-muted">
              {t("promoted.subtitle")}
            </p>
          </div>
          <Link
            to="/listings"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-brass-dark transition-colors hover:text-brass md:inline-flex"
          >
            {t("promoted.viewAll")}
            <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
              →
            </span>
          </Link>
        </div>

        {error ? (
          <ErrorState onRetry={onRetry} />
        ) : loading ? (
          <div
            className="flex gap-3 overflow-hidden sm:gap-4"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="w-[250px] shrink-0 sm:w-[270px] lg:w-[290px]"
              >
                <CarCardSkeleton />
              </div>
            ))}
          </div>
        ) : cars?.length ? (
          <CarCardRow label={t("promoted.title")}>
            {cars.map((car) => (
              <CarCard key={car._id} car={car} premium />
            ))}
          </CarCardRow>
        ) : (
          <EmptyState
            icon={<CarSilhouetteIcon className="w-14 h-9" />}
            title={t("promoted.emptyTitle")}
            description={t("promoted.emptyMessage")}
          />
        )}

        <div className="mt-4 text-center md:hidden">
          <Link
            to="/listings"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brass-dark transition-colors hover:text-brass"
          >
            {t("promoted.viewAll")}
            <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};
