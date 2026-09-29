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
import {
  CarCard,
  CarCardGrid,
  CarCardRow,
} from "../../../shared/components/CarCard.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
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

// Backend caps GET /cars/featured at 20.
const SPONSORED_LIMIT = 20;

// Compact placeholder that matches the compact listing card.
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
  String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

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

  // Sponsored row shows on every tab (All Cars + the three location tabs)
  // unless the user has applied filters on All Cars.
  const showSponsored = activeCount === 0;

  const fetcher = useCallback(
    () =>
      Promise.all([
        filterCars({
          ...filters,
          ...(fixedProvince && { includeFeatured: true }),
          page,
          limit: LIMIT,
        }),

        showSponsored
          ? fetchFeaturedCars(SPONSORED_LIMIT)
          : Promise.resolve({ cars: [] }),
      ]).then(([listings, featured]) => ({
        listings,
        // Featured cars are global; on a location tab keep only that tab's.
        featuredCars: fixedProvince
          ? featured.cars.filter((car) =>
              sameLocation(car.province, fixedProvince),
            )
          : featured.cars,
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

  const sponsoredCars = useMemo(
    () => (showSponsored ? data?.featuredCars || [] : []),
    [showSponsored, data],
  );

  // Location tabs ask the backend to include featured cars in the listing
  // (see fetcher), so remove the ones already shown in the Sponsored row —
  // a car should appear once, not twice.
  const gridCars = useMemo(() => {
    const cars = data?.listings?.cars || [];
    if (!fixedProvince || sponsoredCars.length === 0) return cars;
    const sponsoredIds = new Set(sponsoredCars.map((car) => car._id));
    return cars.filter((car) => !sponsoredIds.has(car._id));
  }, [data, fixedProvince, sponsoredCars]);

  const totalCars = Math.max(
    0,
    (data?.listings?.pagination?.totalCars || 0) -
      (fixedProvince ? sponsoredCars.length : 0),
  );

  return (
    <div className="container-listing py-10 sm:py-14">
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

      {/* SPONSORED — one swipeable row (left <-> right) */}
      {!error && !loading && sponsoredCars.length > 0 && (
        <Reveal delay={120} className="mb-8 sm:mb-10">
          <section aria-labelledby="sponsored-heading">
            <h2
              id="sponsored-heading"
              className="mb-4 font-display text-xl font-bold leading-tight text-section-light sm:text-2xl"
            >
              Sponsored Vehicles
            </h2>

            <CarCardRow label="Sponsored vehicles">
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

      <Reveal delay={180}>
        {error ? (
          <ErrorState onRetry={refetch} />
        ) : loading ? (
          <CarCardGrid dense>
            {Array.from({
              length: LIMIT,
            }).map((_, i) => (
              <CompactCardSkeleton key={i} />
            ))}
          </CarCardGrid>
        ) : gridCars.length || sponsoredCars.length ? (
          <>
            {gridCars.length > 0 && (
              <>
                <p className="mb-4 text-sm text-ash">
                  {totalCars} result
                  {totalCars === 1 ? "" : "s"}
                </p>

                <CarCardGrid dense>
                  {gridCars.map((car) => (
                    <CarCard key={car._id} car={car} variant="compact" />
                  ))}
                </CarCardGrid>
              </>
            )}

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