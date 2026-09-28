import { useState } from "react";
import { Input } from "../../../shared/components/Input.jsx";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import { SORT_OPTIONS } from "../../../services/cars/carsApi.js";

const LOCATION_FIELDS = [
  {
    key: "color",
    label: "Color",
    type: "text",
    placeholder: "e.g. White, Black",
  },
];

const emptyFilters = () => ({
  brand: "",
  model: "",
  province: "",
  color: "",
  steeringType: "",
  fuelType: "",
  bodyType: "",
  transmission: "",
  condition: "",
  engineCC: "",
  minPrice: "",
  maxPrice: "",
  minYear: "",
  maxYear: "",
  minMileage: "",
  maxMileage: "",
  sort: "newest",
});

const SectionLabel = ({ children }) => (
  <div className="mb-4 flex items-center gap-3">
    <p className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brass-dark">
      {children}
    </p>
    <span className="h-px flex-1 bg-card" aria-hidden="true" />
  </div>
);

const renderField = (field, values, update, disabled = false) =>
  field.type === "select" ? (
    <SearchableSelect
      key={field.key}
      label={field.label}
      value={values[field.key]}
      onChange={(value) => update(field.key, value)}
      options={field.options.map((option) => ({
        value: option,
        label: option,
      }))}
      placeholder={disabled ? "Loading…" : "Any"}
      disabled={disabled}
    />
  ) : (
    <Input
      key={field.key}
      label={field.label}
      placeholder={field.placeholder}
      value={values[field.key]}
      onChange={(event) => update(field.key, event.target.value)}
    />
  );

export const FilterPanel = ({ initialValues, onApply, onReset }) => {
  const [values, setValues] = useState({
    ...emptyFilters(),
    ...initialValues,
  });

  const [rangeError, setRangeError] = useState(null);

  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useCarOptions();

  const asOptions = (array) => array ?? [];

  const CENTRALIZED_LOCATION_FIELDS = [
    {
      key: "province",
      label: "Location",
      type: "select",
      options: asOptions(options?.provinces),
    },
  ];

  const SPEC_FIELDS = [
    {
      key: "steeringType",
      label: "Steering Type",
      type: "select",
      options: asOptions(options?.steering),
    },
    {
      key: "fuelType",
      label: "Fuel Type",
      type: "select",
      options: asOptions(options?.fuelTypes),
    },
    {
      key: "bodyType",
      label: "Body Type",
      type: "select",
      options: asOptions(options?.bodyTypes),
    },
    {
      key: "transmission",
      label: "Transmission",
      type: "select",
      options: asOptions(options?.transmissions),
    },
    {
      key: "condition",
      label: "Condition",
      type: "select",
      options: asOptions(options?.conditions),
    },
    {
      key: "engineCC",
      label: "Engine (cc)",
      type: "select",
      options: asOptions(options?.engineCC),
    },
  ];

  const RANGE_DEFS = [
    {
      prefix: "Price ($)",
      minKey: "minPrice",
      maxKey: "maxPrice",
    },
    {
      prefix: "Year",
      minKey: "minYear",
      maxKey: "maxYear",
    },
    {
      prefix: "Mileage (km)",
      minKey: "minMileage",
      maxKey: "maxMileage",
    },
  ];

  const update = (key, value) => {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));

    if (rangeError) {
      setRangeError(null);
    }
  };

  const updateBrand = (brand) => {
    setValues((previous) => ({
      ...previous,
      brand,
      model: "",
    }));

    if (rangeError) {
      setRangeError(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    for (const { prefix, minKey, maxKey } of RANGE_DEFS) {
      const min = values[minKey];
      const max = values[maxKey];

      if (min !== "" && max !== "" && Number(min) > Number(max)) {
        setRangeError(`${prefix} minimum cannot exceed maximum.`);
        return;
      }
    }

    setRangeError(null);
    onApply(values);
  };

  const handleReset = () => {
    const cleared = emptyFilters();
    setValues(cleared);
    setRangeError(null);
    onReset(cleared);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-4">
      {optionsError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3.5"
        >
          <div>
            <p className="text-xs font-semibold text-danger">
              Filter options unavailable
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-ash">
              Some dropdown options could not be loaded.
            </p>
          </div>
          <button
            type="button"
            onClick={refetchOptions}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* BASIC SEARCH */}
      <section>
        <SectionLabel>Basic Search</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField(
            {
              key: "brand",
              label: "Brand",
              type: "select",
              options: asOptions(options?.brands),
            },
            values,
            (key, value) =>
              key === "brand" ? updateBrand(value) : update(key, value),
            optionsLoading,
          )}

          <SearchableSelect
            id="filter-model"
            label="Model"
            value={values.model}
            onChange={(model) => update("model", model)}
            options={(options?.modelsByBrand?.[values.brand] ?? []).map(
              (model) => ({ value: model, label: model }),
            )}
            placeholder={values.brand ? "Any model" : "Select brand first"}
            disabled={!values.brand}
            disabledLabel="Select brand first"
          />

          <SearchableSelect
            label="Year"
            value={
              values.minYear !== "" && values.minYear === values.maxYear
                ? values.minYear
                : ""
            }
            onChange={(year) =>
              setValues((previous) => ({
                ...previous,
                minYear: year,
                maxYear: year,
              }))
            }
            options={asOptions(options?.years).map((year) => ({
              value: String(year),
              label: String(year),
            }))}
            placeholder={optionsLoading ? "Loading…" : "Any year"}
            disabled={optionsLoading}
          />
        </div>
      </section>

      {/* LOCATION */}
      <section>
        <SectionLabel>Location & Color</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CENTRALIZED_LOCATION_FIELDS.map((field) =>
            renderField(field, values, update, optionsLoading),
          )}
          {LOCATION_FIELDS.map((field) => renderField(field, values, update))}
        </div>
      </section>

      {/* SPECIFICATIONS */}
      <section>
        <SectionLabel>Specifications</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SPEC_FIELDS.map((field) =>
            renderField(field, values, update, optionsLoading),
          )}
        </div>
      </section>

      {/* RANGES */}
      <section>
        <SectionLabel>Price, Year & Mileage</SectionLabel>
        <div className="space-y-4">
          {RANGE_DEFS.map(({ prefix, minKey, maxKey }) => (
            <div key={prefix}>
              <p className="mb-2 text-xs font-semibold text-bone">{prefix}</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  aria-label={`Minimum ${prefix}`}
                  value={values[minKey]}
                  onChange={(event) => update(minKey, event.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  aria-label={`Maximum ${prefix}`}
                  value={values[maxKey]}
                  onChange={(event) => update(maxKey, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SORT */}
      <section>
        <SectionLabel>Sort Results</SectionLabel>
        <SearchableSelect
          value={values.sort}
          onChange={(value) => update("sort", value)}
          options={SORT_OPTIONS}
          allowClear={false}
        />
      </section>

      {rangeError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-xs leading-5 text-danger"
        >
          {rangeError}
        </div>
      )}

      {/* ACTION BAR */}
      <div className="sticky bottom-0 z-20 -mx-5 -mb-2 mt-6 flex gap-3 border-t border-card bg-white/95 px-5 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <button
          type="submit"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brass px-5 text-sm font-semibold text-graphite-950 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="h-12 shrink-0 rounded-xl border border-card bg-white px-5 text-sm font-semibold text-ash transition-all duration-200 hover:border-brass/40 hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export { emptyFilters };
