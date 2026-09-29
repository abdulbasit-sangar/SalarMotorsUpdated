import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterPanel, emptyFilters } from "./FilterPanel.jsx";
import { FilterSheet } from "./FilterSheet.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchFeaturedCars,
  filterCars,
  SORT_OPTIONS,
} from "../../../services/cars/carsApi.js";
import { CarCard, CarCardGrid } from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { Pagination } from "../../../shared/components/Pagination.jsx";
import {
  CarSilhouetteIcon,
  SlidersIcon,
  ChevronDownIcon,
  CloseIcon,
} from "../../../shared/components/icons.jsx";

const LIMIT = 12;

// Only these keys are sent to the backend — page/limit are handled separately.
const FILTER_KEYS = [
  "brand",
  "model",
  "province",
  "color",
  "fuelType",
  "bodyType",
  "transmission",
  "condition",
  "engineCC",
  "minPrice",
  "maxPrice",
  "minYear",
  "maxYear",
  "minMileage",
  "maxMileage",
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

// Filter keys whose value is already a human-readable label on its own.
const DIRECT_LABEL_KEYS = [
  "brand",
  "model",
  "province",
  "color",
  "fuelType",
  "bodyType",
  "transmission",
  "condition",
];

// Min/max pairs are collapsed into a single chip each.
const RANGE_KEY_GROUPS = [
  {
    minKey: "minPrice",
    maxKey: "maxPrice",
    prefix: "Price",
    format: (v) => `$${Number(v).toLocaleString()}`,
  },
  {
    minKey: "minYear",
    maxKey: "maxYear",
    prefix: "Year",
    format: (v) => v,
  },
  {
    minKey: "minMileage",
    maxKey: "maxMileage",
    prefix: "Mileage",
    format: (v) => `${Number(v).toLocaleString()} km`,
  },
];

const rangeChipLabel = (prefix, min, max, format) => {
  if (min && max) {
    return min === max
      ? `${prefix}: ${format(min)}`
      : `${prefix}: ${format(min)} – ${format(max)}`;
  }

  return min
    ? `${prefix}: from ${format(min)}`
    : `${prefix}: up to ${format(max)}`;
};

// Lightweight scroll/mount reveal.
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

const Reveal = ({ children, delay = 0, className = "" }) => {
  const [ref, visible] = useReveal();

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

// Builds the removable applied-filter chips.
const buildActiveChips = (filters) => {
  const chips = [];

  DIRECT_LABEL_KEYS.forEach((key) => {
    if (filters[key]) {
      chips.push({
        id: key,
        label: filters[key],
        keys: [key],
      });
    }
  });

  if (filters.engineCC) {
    chips.push({
      id: "engineCC",
      label: `${filters.engineCC} cc`,
      keys: ["engineCC"],
    });
  }

  RANGE_KEY_GROUPS.forEach(({ minKey, maxKey, prefix, format }) => {
    const min = filters[minKey];
    const max = filters[maxKey];

    if (min || max) {
      chips.push({
        id: minKey,
        label: rangeChipLabel(prefix, min, max, format),
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);

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
    : FILTER_KEYS.filter((key) => key !== "sort" && filters[key]).length;

  const activeChips = useMemo(
    () => (fixedProvince ? [] : buildActiveChips(filters)),
    [filters, fixedProvince],
  );

  const isFiltered = Boolean(fixedProvince) || activeCount > 0;

  const fetcher = useCallback(
    () =>
      Promise.all([
        filterCars({
          ...filters,
          ...(fixedProvince && { includeFeatured: true }),
          page,
          limit: LIMIT,
        }),

        // Sponsored cars only on the unfiltered browse view.
        isFiltered ? Promise.resolve({ cars: [] }) : fetchFeaturedCars(4),
      ]).then(([listings, featured]) => ({
        listings,
        featuredCars: featured.cars,
      })),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString(), page, fixedProvince],
  );

  const { data, loading, error, refetch } = useAsyncData(fetcher, [
    searchParams.toString(),
    page,
    fixedProvince,
  ]);

  const applyFilters = (values) => {
    const params = new URLSearchParams();

    FILTER_KEYS.forEach((key) => {
      if (values[key]) {
        params.set(key, values[key]);
      }
    });

    setSearchParams(params);
    setMobilePanelOpen(false);
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
    setMobilePanelOpen(false);
  };

  const removeChip = (keys) => {
    const params = new URLSearchParams(searchParams);

    keys.forEach((key) => params.delete(key));

    params.delete("page");

    setSearchParams(params);
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
  };

  const handlePageChange = (nextPage) => {
    const params = new URLSearchParams(searchParams);

    if (nextPage === 1) {
      params.delete("page");
    } else {
      params.set("page", nextPage);
    }

    setSearchParams(params);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <Reveal className="relative z-10 mb-8 pt-16 sm:pt-20">
        {fixedProvince && (
          <h1 className="mb-6 font-display text-3xl font-semibold text-bone">
            {fixedTitle}
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
              <span>Filters{activeCount > 0 && ` (${activeCount})`}</span>
            </button>
          )}

          <label htmlFor="filter-sort" className="sr-only">
            Sort listings
          </label>

          <div className="relative shrink-0">
            <select
              id="filter-sort"
              value={sort}
              onChange={(event) => handleSortChange(event.target.value)}
              className="peer absolute inset-0 z-10 h-11 w-full cursor-pointer opacity-0"
              aria-label="Sort options"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="inline-flex h-11 min-w-[105px] items-center justify-center gap-2 rounded-full glass-panel px-5 text-sm font-semibold text-bone shadow-sm transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brass/40"
            >
              <span>Sort</span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-brass-dark" />
            </button>
          </div>
        </div>
      </Reveal>

      {!fixedProvince && (
        <FilterSheet
          open={mobilePanelOpen}
          onClose={() => setMobilePanelOpen(false)}
          title="Refine Results"
          description="Adjust your search and apply changes."
        >
          <FilterPanel
            initialValues={filters}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </FilterSheet>
      )}

      {activeChips.length > 0 && (
        <Reveal delay={60} className="flex flex-wrap items-center gap-2 mb-8">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => removeChip(chip.keys)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brass/12 border border-brass/30 pl-3.5 pr-2.5 py-1.5 text-xs font-semibold text-brass-dark transition-colors hover:bg-brass/20"
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
            Reset Filter
          </button>
        </Reveal>
      )}

      {/* =========================================================
          SPONSORED SECTION
          FIX: Uses the same container/grid alignment as the
          regular vehicle results instead of rendering CarSection,
          which adds another nested container.
          ========================================================= */}
      {!error && !loading && !isFiltered && data?.featuredCars?.length > 0 && (
        <Reveal delay={120} className="mb-10">
          <section>
            <div className="mb-6 sm:mb-7">
              <p className="section-eyebrow">Handpicked</p>

              <h2 className="mt-1.5 font-display text-3xl font-bold leading-tight text-section-light sm:text-4xl">
                Sponsored
              </h2>
            </div>

            <CarCardGrid>
              {data.featuredCars.map((car) => (
                <CarCard key={car._id} car={car} premium sponsored />
              ))}
            </CarCardGrid>
          </section>
        </Reveal>
      )}

      <Reveal delay={180}>
        {error ? (
          <ErrorState onRetry={refetch} />
        ) : loading ? (
          <CarCardGrid>
            {Array.from({
              length: LIMIT,
            }).map((_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </CarCardGrid>
        ) : data?.listings?.cars?.length ? (
          <>
            <p className="text-ash text-sm mb-6">
              {data.listings.pagination.totalCars} result
              {data.listings.pagination.totalCars === 1 ? "" : "s"}
            </p>

            <CarCardGrid>
              {data.listings.cars.map((car) => (
                <CarCard key={car._id} car={car} />
              ))}
            </CarCardGrid>

            <div className="mt-10">
              <Pagination
                pagination={data.listings.pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={<CarSilhouetteIcon className="w-14 h-9" />}
            title="No matches"
            description={
              fixedProvince
                ? `No vehicles are currently listed for ${fixedTitle}.`
                : "Nothing fits these filters yet. Try widening a range or clearing a field."
            }
            actionLabel={activeCount > 0 ? "Clear filters" : undefined}
            onAction={activeCount > 0 ? resetFilters : undefined}
          />
        )}
      </Reveal>
    </div>
  );
}
