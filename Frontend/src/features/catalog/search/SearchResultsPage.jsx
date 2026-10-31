import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInfiniteCars } from "../../../shared/hooks/useInfiniteCars.js";
import { searchCars } from "../../../services/cars/carsApi.js";
import { CarCard, CarCardGrid } from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { InfiniteScrollFooter } from "../../../shared/components/InfiniteScrollFooter.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";

const LIMIT = 12;

// Mounted only for a non-empty keyword; a new keyword resets the list.
function SearchResultsList({ keyword }) {
  const { t } = useTranslation("catalog");

  const fetchBatch = useCallback(
    (page) => searchCars({ keyword, page, limit: LIMIT }),
    [keyword],
  );

  const {
    cars,
    totalCars,
    hasMore,
    initialLoading,
    initialError,
    loadingMore,
    loadMoreError,
    sentinelRef,
    retryInitial,
    retryLoadMore,
  } = useInfiniteCars(fetchBatch, keyword);

  if (initialError) return <ErrorState onRetry={retryInitial} />;

  if (initialLoading) {
    return (
      <CarCardGrid>
        {Array.from({ length: LIMIT }).map((_, i) => (
          <CarCardSkeleton key={i} />
        ))}
      </CarCardGrid>
    );
  }

  if (!cars.length) {
    return (
      <EmptyState
        icon={<CarSilhouetteIcon className="w-14 h-9" />}
        title={t("search.noMatchesTitle")}
        description={t("search.noMatchesDescription", { keyword })}
      />
    );
  }

  return (
    <>
      <p className="text-ash text-sm mb-6">
        {t("search.results", { count: totalCars })}
      </p>
      <CarCardGrid>
        {cars.map((car) => (
          <CarCard key={car._id} car={car} />
        ))}
      </CarCardGrid>
      <InfiniteScrollFooter
        hasMore={hasMore}
        loadingMore={loadingMore}
        loadMoreError={loadMoreError}
        onRetry={retryLoadMore}
        sentinelRef={sentinelRef}
      />
    </>
  );
}

export default function SearchResultsPage() {
  const { t } = useTranslation("catalog");
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  return (
    <div className="container-page pb-10 pt-28 sm:pb-14 sm:pt-32">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {t("search.eyebrow")}
      </p>
      <h1 className="font-display text-2xl sm:text-3xl font-medium text-bone mb-6">

        {keyword ? (
          <>
            {t("search.resultsFor")}{" "}
            <bdi className="text-brass">{keyword}</bdi>
          </>
        ) : (
          t("search.title")
        )}
      </h1>

      {!keyword.trim() ? (
        <EmptyState
          icon={<CarSilhouetteIcon className="w-14 h-9" />}
          title={t("search.promptTitle")}
          description={t("search.promptDescription")}
        />
      ) : (
        <SearchResultsList keyword={keyword} />
      )}
    </div>
  );
}
