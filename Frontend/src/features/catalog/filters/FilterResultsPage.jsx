import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { optionKey, useOptionLabel } from "../../../i18n/optionLabels.js";
import { FilterPanel, emptyFilters } from "./FilterPanel.jsx";
import { FilterSheet } from "./FilterSheet.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchFeaturedCars,
  filterCars,
  SORT_OPTIONS,
} from "../../../services/cars/carsApi.js";
import {
  CarCard,
  CarCardGrid,
  CarCardRow,
} from "../../../shared/components/CarCard.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { InfiniteScrollFooter } from "../../../shared/components/InfiniteScrollFooter.jsx";
import { useInfiniteCars } from "../../../shared/hooks/useInfiniteCars.js";
import {
  CarSilhouetteIcon,
  SlidersIcon,
  ChevronDownIcon,
  CloseIcon,
} from "../../../shared/components/icons.jsx";

const LIMIT = 12;
const SPONSORED_LIMIT = 20;

const CompactCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-card bg-card shadow-card">
    <Skeleton className="aspect-[16/10] w-full rounded-none" />
    <div className="space-y-2.5 p-3.5 sm:p-4">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const sameLocation = (a, b) =>
  String(a || "").trim().toLowerCase() ===
  String(b || "").trim().toLowerCase();

// Only the requested filter fields are applied through the filter panel.
const FILTER_KEYS = [
  "brand",
  "model",
  "province",
  "color",
  "minYear",
  "maxYear",
  "sort",
];

const paramsToFilters = (searchParams) => {
  const result = { ...emptyFilters() };

  FILTER_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) result[key] = value;
  });

  return result;
};

const DIRECT_LABEL_KEYS = [
  "brand",
  "model",
  "province",
  "color",
];

// Whole sentences per case (not "prefix + fragment") so each language can
// order the words naturally. Keys live in catalog.json under chips.*
const RANGE_KEY_GROUPS = [{ minKey: "minYear", maxKey: "maxYear", chip: "year" }];

const rangeChipLabel = (t, chip, min, max) => {
  if (min && max) {
    return min === max
      ? t(`chips.${chip}`, { [chip]: min })
      : t(`chips.${chip}Range`, { min, max });
  }

  return min
    ? t(`chips.${chip}From`, { min })
    : t(`chips.${chip}UpTo`, { max });
};

const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};

const Reveal = ({ children, delay = 0, className = "", threshold }) => {
  const [ref, visible] = useReveal(threshold);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
      }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const buildActiveChips = (filters, t, label) => {
  const chips = [];

  DIRECT_LABEL_KEYS.forEach((key) => {
    if (filters[key]) {
      chips.push({
        id: key,
        // Only the province is a fixed backend value with a translation;
        // brand/model/color stay as selected or typed.
        label: key === "province" ? label("province", filters[key]) : filters[key],
        keys: [key],
      });
    }
  });

  RANGE_KEY_GROUPS.forEach(({ minKey, maxKey, chip }) => {
    const min = filters[minKey];
    const max = filters[maxKey];

    if (min || max) {
      chips.push({
        id: minKey,
        label: rangeChipLabel(t, chip, min, max),
        keys: [minKey, maxKey],
      });
    }
  });

  return chips;
};

export default function FilterResultsPage({
  fixedProvince = "",
  fixedTitle = "",
}) {
  const { t } = useTranslation("catalog");
  const label = useOptionLabel();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const sort = searchParams.get("sort") || "newest";

  const filters = useMemo(
    () =>
      fixedProvince
        ? { ...emptyFilters(), province: fixedProvince, sort }
        : paramsToFilters(searchParams),
    [fixedProvince, searchParams, sort],
  );

  const activeCount = fixedProvince
    ? 0
    : FILTER_KEYS.filter(
        (key) => key !== "sort" && filters[key],
      ).length;

  const activeChips = useMemo(
    () => (fixedProvince ? [] : buildActiveChips(filters, t, label)),
    [filters, fixedProvince, t, label],
  );

  // The router still passes an English fixedTitle; the shown title is looked
  // up by the category value and falls back to that English title.
  const categoryTitle = fixedProvince
    ? t(`categories.${optionKey(fixedProvince)}`, { defaultValue: fixedTitle })
    : "";

  const showSponsored = activeCount === 0;

  // Query identity: any change of filters, sort or category starts a fresh
  // list. Legacy ?page= links are ignored — the list is one continuous scroll.
  const queryKey = useMemo(
    () => JSON.stringify([fixedProvince, filters]),
    [fixedProvince, filters],
  );

  const fetchBatch = useCallback(
    (page) =>
      filterCars({
        ...filters,
        ...(fixedProvince && { includeFeatured: true }),
        page,
        limit: LIMIT,
      }),
    // `queryKey` captures filters + fixedProvince.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey],
  );

  const {
    cars: listedCars,
    totalCars: listedTotal,
    hasMore,
    initialLoading: loading,
    initialError: error,
    loadingMore,
    loadMoreError,
    sentinelRef,
    retryInitial: refetch,
    retryLoadMore,
  } = useInfiniteCars(fetchBatch, queryKey);

  const fetchSponsored = useCallback(
    () =>
      showSponsored
        ? fetchFeaturedCars(SPONSORED_LIMIT)
        : Promise.resolve({ cars: [] }),
    [showSponsored],
  );
  const { data: sponsoredData } = useAsyncData(fetchSponsored, [showSponsored]);

  const applyFilters = (values) => {
    const params = new URLSearchParams();

    FILTER_KEYS.forEach((key) => {
      if (values[key]) {
        params.set(key, values[key]);
      }
    });

    setSearchParams(params);
    setMobilePanelOpen(false);
    window.scrollTo({ top: 0 });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
    setMobilePanelOpen(false);
    window.scrollTo({ top: 0 });
  };

  const removeChip = (keys) => {
    const params = new URLSearchParams(searchParams);

    keys.forEach((key) => params.delete(key));
    params.delete("page");

    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const handleSortChange = (value) => {
    const params = new URLSearchParams(searchParams);

    if (!value || value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    params.delete("page");
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const sponsoredCars = useMemo(() => {
    if (!showSponsored) return [];
    const cars = sponsoredData?.cars || [];
    return fixedProvince
      ? cars.filter((car) => sameLocation(car.province, fixedProvince))
      : cars;
  }, [showSponsored, sponsoredData, fixedProvince]);

  const gridCars = useMemo(() => {
    const cars = listedCars;

    if (!fixedProvince || sponsoredCars.length === 0) {
      return cars;
    }

    const sponsoredIds = new Set(sponsoredCars.map((car) => car._id));
    return cars.filter((car) => !sponsoredIds.has(car._id));
  }, [listedCars, fixedProvince, sponsoredCars]);

  const totalCars = Math.max(
    0,
    listedTotal -
      (fixedProvince ? sponsoredCars.length : 0),
  );

  return (
    <div className="container-listing py-10 sm:py-14">
      <Reveal className="relative z-10 mb-8 pt-16 sm:pt-20">
        {fixedProvince && (
          <h1 className="mb-6 font-display text-3xl font-semibold text-bone">
            {categoryTitle}
          </h1>
        )}

        <div
          className={`flex w-full items-center gap-3 sm:justify-end sm:gap-3 ${
            fixedProvince ? "justify-end" : "justify-between"
          }`}
        >
          {!fixedProvince && (
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="inline-flex h-11 min-w-[120px] flex-1 items-center justify-center gap-2 rounded-full glass-panel px-5 text-sm font-semibold text-bone shadow-sm transition-all duration-200 hover:bg-white/85 sm:min-w-[120px] sm:flex-none"
            >
              <SlidersIcon className="h-4 w-4 shrink-0 text-brass-dark" />
              <span>
                {t("results.filters")}
                {activeCount > 0 && ` (${activeCount})`}
              </span>
            </button>
          )}

          <label htmlFor="filter-sort" className="sr-only">
            {t("results.sortLabel")}
          </label>

          <div className="relative shrink-0">
            <select
              id="filter-sort"
              value={sort}
              onChange={(event) => handleSortChange(event.target.value)}
              className="peer absolute inset-0 z-10 h-11 w-full cursor-pointer opacity-0"
              aria-label={t("results.sortOptions")}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {label("sort", option.value)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="inline-flex h-11 min-w-[105px] items-center justify-center gap-2 rounded-full glass-panel px-5 text-sm font-semibold text-bone shadow-sm transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brass/40"
            >
              <span>{t("results.sortButton")}</span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-brass-dark" />
            </button>
          </div>
        </div>
      </Reveal>

      {!fixedProvince && (
        <FilterSheet
          open={mobilePanelOpen}
          onClose={() => setMobilePanelOpen(false)}
        >
          <FilterPanel
            initialValues={filters}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </FilterSheet>
      )}

      {activeChips.length > 0 && (
        <Reveal delay={60} className="mb-8 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => removeChip(chip.keys)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-brass/12 py-1.5 ps-3.5 pe-2.5 text-xs font-semibold text-brass-dark transition-colors hover:bg-brass/20"
            >
              {chip.label}
              <CloseIcon className="h-3 w-3" />
            </button>
          ))}

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-graphite-950 shadow-sm transition-all hover:bg-brass-light"
          >
            {t("results.resetFilter")}
          </button>
        </Reveal>
      )}

      {/* SPONSORED VEHICLES */}
      {!error && !loading && sponsoredCars.length > 0 && (
        <Reveal delay={120} className="mb-8 sm:mb-10">
          <section aria-labelledby="sponsored-heading">
            <h2
              id="sponsored-heading"
              className="mb-4 font-display text-xl font-bold leading-tight text-section-light sm:text-2xl"
            >
              {t("results.sponsored")}
            </h2>

            <CarCardRow label={t("results.sponsoredRow")}>
              {sponsoredCars.map((car) => (
                <CarCard
                  key={car._id}
                  car={car}
                  premium
                  sponsored
                  variant="compact"
                />
              ))}
            </CarCardRow>
          </section>
        </Reveal>
      )}

      <Reveal delay={180} threshold={0}>
        {error ? (
          <ErrorState onRetry={refetch} />
        ) : loading ? (
          <CarCardGrid dense>
            {Array.from({ length: LIMIT }).map((_, index) => (
              <CompactCardSkeleton key={index} />
            ))}
          </CarCardGrid>
        ) : gridCars.length || sponsoredCars.length ? (
          <>
            {gridCars.length > 0 && (
              <>
                <p className="mb-4 text-sm text-ash">
                  {t("results.count", { count: totalCars })}
                </p>

                <CarCardGrid dense>
                  {gridCars.map((car) => (
                    <CarCard
                      key={car._id}
                      car={car}
                      variant="compact"
                    />
                  ))}
                </CarCardGrid>
              </>
            )}

            <InfiniteScrollFooter
              hasMore={hasMore}
              loadingMore={loadingMore}
              loadMoreError={loadMoreError}
              onRetry={retryLoadMore}
              sentinelRef={sentinelRef}
            />
          </>
        ) : (
          <EmptyState
            icon={<CarSilhouetteIcon className="h-9 w-14" />}
            title={t("results.noMatchesTitle")}
            description={
              fixedProvince
                ? t("results.noMatchesCategory", { title: categoryTitle })
                : t("results.noMatchesFilters")
            }
            actionLabel={activeCount > 0 ? t("results.clearFilters") : undefined}
            onAction={activeCount > 0 ? resetFilters : undefined}
          />
        )}
      </Reveal>
    </div>
  );
}