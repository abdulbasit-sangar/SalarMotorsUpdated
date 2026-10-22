import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { searchCars } from "../../../services/cars/carsApi.js";
import { CarCard, CarCardGrid } from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { Pagination } from "../../../shared/components/Pagination.jsx";
import { SearchBar } from "../../../shared/components/SearchBar.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";

const LIMIT = 12;

export default function SearchResultsPage() {
  const { t } = useTranslation("catalog");
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);

  const fetcher = useCallback(() => {
    if (!keyword.trim())
      return Promise.resolve({ cars: [], pagination: null, keyword: "" });
    return searchCars({ keyword, page, limit: LIMIT });
  }, [keyword, page]);

  const { data, loading, error, refetch } = useAsyncData(fetcher, [
    keyword,
    page,
  ]);

  const handlePageChange = (nextPage) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage === 1) params.delete("page");
    else params.set("page", nextPage);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container-page pb-10 pt-28 sm:pb-14 sm:pt-32">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {t("search.eyebrow")}
      </p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-bone mb-6">
        {keyword ? (
          <>
            {t("search.resultsFor")}{" "}
            <bdi className="text-brass">&ldquo;{keyword}&rdquo;</bdi>
          </>
        ) : (
          t("search.title")
        )}
      </h1>

      {/* <div className="max-w-xl mb-10">
        <SearchBar />
      </div> */}

      {!keyword.trim() ? (
        <EmptyState
          icon={<CarSilhouetteIcon className="w-14 h-9" />}
          title={t("search.promptTitle")}
          description={t("search.promptDescription")}
        />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : loading ? (
        <CarCardGrid>
          {Array.from({ length: LIMIT }).map((_, i) => (
            <CarCardSkeleton key={i} />
          ))}
        </CarCardGrid>
      ) : data?.cars?.length ? (
        <>
          <p className="text-ash text-sm mb-6">
            {t("search.results", { count: data.pagination.totalCars })}
          </p>
          <CarCardGrid>
            {data.cars.map((car) => (
              <CarCard key={car._id} car={car} />
            ))}
          </CarCardGrid>
          <div className="mt-10">
            <Pagination
              pagination={data.pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={<CarSilhouetteIcon className="w-14 h-9" />}
          title={t("search.noMatchesTitle")}
          description={t("search.noMatchesDescription", { keyword })}
        />
      )}
    </div>
  );
}
