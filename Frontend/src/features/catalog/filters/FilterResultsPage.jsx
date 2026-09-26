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
import { CarSection } from "../../../shared/components/CarSection.jsx";
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
  "steeringType",
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

// Filter keys whose value is already a human-readable label on its own
// (brand, color, province, etc.) — shown as-is in a chip.
const DIRECT_LABEL_KEYS = [
  "brand",
  "model",
  "province",
  "color",
  "steeringType",
  "fuelType",
  "bodyType",
  "transmission",
  "condition",
];

// Min/max pairs are collapsed into a single chip each, e.g. "Price: $20,000
// – $50,000", so removing one chip clears both ends of that range.
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
    return min === max ? `${prefix}: ${format(min)}` : `${prefix}: ${format(min)} – ${format(max)}`;
  }
  return min ? `${prefix}: from ${format(min)}` : `${prefix}: up to ${format(max)}`;
};

// Lightweight scroll/mount reveal — same pattern used on Home and About, so
// the Browse page animates in consistently with the rest of the site.
// Above-the-fold content (this page's whole layout) reveals immediately on
// load since it's already within the viewport when observed.
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
      { threshold, rootMargin: "0px 0px -60px 0px" },
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
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Builds the removable "applied filter" chips shown above the results —
// one chip per active filter, each knowing exactly which URL param(s) to
// clear when its close button is clicked.
const buildActiveChips = (filters) => {
  const chips = [];

  DIRECT_LABEL_KEYS.forEach((key) => {
    if (filters[key]) chips.push({ id: key, label: filters[key], keys: [key] });
  });

  if (filters.engineCC) {
    chips.push({ id: "engineCC", label: `${filters.engineCC} cc`, keys: ["engineCC"] });
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

export default function FilterResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const sort = searchParams.get("sort") || "newest";
  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);

  const activeCount = FILTER_KEYS.filter(
    (k) => k !== "sort" && filters[k],
  ).length;
  const activeChips = useMemo(() => buildActiveChips(filters), [filters]);
  const isFiltered = activeCount > 0;

  const fetcher = useCallback(
    () =>
      Promise.all([
        filterCars({ ...filters, page, limit: LIMIT }),
        // Sponsored/featured cars are only shown on the unfiltered browse
        // view — skip the extra request entirely once a filter is active.
        isFiltered ? Promise.resolve({ cars: [] }) : fetchFeaturedCars(4),
      ]).then(([listings, featured]) => ({
        listings,
        featuredCars: featured.cars,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString(), page],
  );
  const { data, loading, error, refetch } = useAsyncData(fetcher, [
    searchParams.toString(),
    page,
  ]);

  const applyFilters = (values) => {
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      if (values[key]) params.set(key, values[key]);
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
    if (!value || value === "newest") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    setSearchParams(params);
  };

  const handlePageChange = (nextPage) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage === 1) params.delete("page");
    else params.set("page", nextPage);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <Reveal className="flex mb-8 sm:justify-end">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobilePanelOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full glass-panel px-5 text-sm font-semibold text-bone shadow-sm transition-all duration-200 hover:bg-white/85"
          >
            <SlidersIcon className="h-4 w-4 text-brass-dark" />
            Filters{activeCount > 0 && ` (${activeCount})`}
          </button>

          <label htmlFor="filter-sort" className="sr-only">
            Sort listings
          </label>
          <div className="relative">
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full glass-panel px-5 text-sm font-semibold text-bone shadow-sm transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brass/40"
            >
              <span>Sort</span>
              <ChevronDownIcon className="h-4 w-4 text-brass-dark" />
            </button>
          </div>
        </div>
      </Reveal>

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

      {!error && !loading && !isFiltered && data?.featuredCars?.length > 0 && (
        <Reveal delay={120} className="space-y-8 mb-10">
          <CarSection
            eyebrow="Handpicked"
            title="Sponsored"
            cars={data.featuredCars}
            loading={loading}
            error={error}
            onRetry={refetch}
            sponsored
            emptyMessage="Nothing is sponsored right now — check back soon."
          />
        </Reveal>
      )}

      <Reveal delay={180}>
        {error ? (
            <ErrorState onRetry={refetch} />
          ) : loading ? (
            <CarCardGrid>
              {Array.from({ length: LIMIT }).map((_, i) => (
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
              description="Nothing fits these filters yet. Try widening a range or clearing a field."
              actionLabel={activeCount > 0 ? "Clear filters" : undefined}
              onAction={activeCount > 0 ? resetFilters : undefined}
            />
          )}
      </Reveal>
    </div>
  );
}