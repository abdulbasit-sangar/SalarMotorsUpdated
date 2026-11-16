import { useTranslation } from "react-i18next";
import {
  CarCard,
  CarCardRow,
} from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";

// Card widths match the All Cars dense-grid column at every breakpoint:
// (container width − side padding − gaps) ÷ columns. The row keeps its
// swipe / drag / arrow behaviour; only the card size changes. At 1680px
// and wider the container stops growing, so the width caps at the exact
// grid column: (1680 − 48 − 48) ÷ 4 = 396px.
const GRID_CARD_WIDTH =
  "w-[calc(100vw-2rem)] sm:w-[calc(50vw-1.75rem)] md:w-[calc(33.333vw-1.5rem)] lg:w-[calc(25vw-1.5rem)] min-[1680px]:w-[396px]";

// Promoted (featured) vehicles in the existing CarCardRow: swipe on phones,
// drag with the mouse, and left/right arrow buttons on tablets and desktops.
// The row already handles RTL direction, edge states and reduced motion.
// Cards are the same compact card as the All Cars page.
export const PromotedCarousel = ({ cars, loading, error, onRetry }) => {
  const { t } = useTranslation("home");

  return (
    <section
      id="promoted"
      className="scroll-mt-20 bg-section-light py-14 sm:py-20"
    >
      <div className="container-listing">
        <h2 className="mb-6 font-display text-xl font-bold leading-tight text-section-light sm:mb-8 sm:text-2xl">
          {t("promoted.title")}
        </h2>

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
                className={`shrink-0 ${GRID_CARD_WIDTH}`}
              >
                <CarCardSkeleton />
              </div>
            ))}
          </div>
        ) : cars?.length ? (
          <CarCardRow
            label={t("promoted.title")}
            cardWidthClass={GRID_CARD_WIDTH}
          >
            {cars.map((car) => (
              <CarCard key={car._id} car={car} premium variant="compact" />
            ))}
          </CarCardRow>
        ) : (
          <EmptyState
            icon={<CarSilhouetteIcon className="w-14 h-9" />}
            title={t("promoted.emptyTitle")}
            description={t("promoted.emptyMessage")}
          />
        )}
      </div>
    </section>
  );
};
