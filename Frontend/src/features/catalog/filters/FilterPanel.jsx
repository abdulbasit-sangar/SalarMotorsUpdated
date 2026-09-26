import { useState } from "react";
import { Input } from "../../../shared/components/Input.jsx";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import { SORT_OPTIONS } from "../../../services/cars/carsApi.js";

const IDENTITY_FIELDS = [
  { key: "model", label: "Model", type: "text", placeholder: "e.g. Corolla" },
];

const LOCATION_FIELDS = [
  { key: "color", label: "Color", type: "text", placeholder: "e.g. White" },
];

const emptyFilters = () => ({
  brand: "", model: "", province: "", color: "",
  steeringType: "", fuelType: "", bodyType: "", transmission: "", condition: "",
  engineCC: "",
  minPrice: "", maxPrice: "", minYear: "", maxYear: "", minMileage: "", maxMileage: "",
  sort: "newest",
});

const SectionLabel = ({ children }) => (
  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ash mb-3">
    {children}
  </p>
);

const renderField = (field, values, update, disabled) =>
  field.type === "select" ? (
    <SearchableSelect
      key={field.key}
      label={field.label}
      value={values[field.key]}
      onChange={(value) => update(field.key, value)}
      options={field.options.map((opt) => ({ value: opt, label: opt }))}
      placeholder={disabled ? "Loading…" : "Any"}
      disabled={disabled}
    />
  ) : (
    <Input
      key={field.key}
      label={field.label}
      placeholder={field.placeholder}
      value={values[field.key]}
      onChange={(e) => update(field.key, e.target.value)}
    />
  );

export const FilterPanel = ({ initialValues, onApply, onReset }) => {
  const [values, setValues] = useState({ ...emptyFilters(), ...initialValues });
  const [rangeError, setRangeError] = useState(null);
  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useCarOptions();

  const asOptions = (arr) => arr ?? [];

  // Fields whose option lists come from the centralized /api/cars/options
  // endpoint — built here (not as a module constant) since they depend on
  // the fetched `options`.
  const CENTRALIZED_LOCATION_FIELDS = [
    { key: "province", label: "Location", type: "select", options: asOptions(options?.provinces) },
  ];

  const SPEC_FIELDS = [
    { key: "steeringType", label: "Steering Type", type: "select", options: asOptions(options?.steering) },
    { key: "fuelType", label: "Fuel Type", type: "select", options: asOptions(options?.fuelTypes) },
    { key: "bodyType", label: "Body Type", type: "select", options: asOptions(options?.bodyTypes) },
    { key: "transmission", label: "Transmission", type: "select", options: asOptions(options?.transmissions) },
    { key: "condition", label: "Condition", type: "select", options: asOptions(options?.conditions) },
    { key: "engineCC", label: "Engine (cc)", type: "select", options: asOptions(options?.engineCC) },
  ];

  const RANGE_DEFS = [
    { prefix: "Price", minKey: "minPrice", maxKey: "maxPrice" },
    { prefix: "Year", minKey: "minYear", maxKey: "maxYear" },
    { prefix: "Mileage (km)", minKey: "minMileage", maxKey: "maxMileage" },
  ];

  const update = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    for (const { prefix, minKey, maxKey } of RANGE_DEFS) {
      const min = values[minKey];
      const max = values[maxKey];
      if (min !== "" && max !== "" && Number(min) > Number(max)) {
        setRangeError(`${prefix} minimum can't be greater than the maximum.`);
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
    <form onSubmit={handleSubmit} className="space-y-7">
      {optionsError && (
        <div
          role="alert"
          className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
        >
          <p className="text-danger text-xs">
            Couldn't load some filter options.
          </p>
          <button
            type="button"
            onClick={refetchOptions}
            className="text-danger text-xs font-semibold underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* BRAND DROPDOWN */}
        {renderField(
          { key: "brand", label: "Brand", type: "select", options: asOptions(options?.brands) },
          values,
          update,
          optionsLoading,
        )}
        {IDENTITY_FIELDS.map((field) => renderField(field, values, update))}

        {/* YEAR DROPDOWN — a quick exact-year pick that sets minYear and
            maxYear to the same value. Sits alongside (not instead of) the
            existing Year range in the Ranges section below, for people who
            want a span rather than one exact year. */}
        <SearchableSelect
          label="Year"
          value={values.minYear !== "" && values.minYear === values.maxYear ? values.minYear : ""}
          onChange={(year) => setValues((prev) => ({ ...prev, minYear: year, maxYear: year }))}
          options={asOptions(options?.years).map((year) => ({ value: String(year), label: String(year) }))}
          placeholder={optionsLoading ? "Loading…" : "Any year"}
          disabled={optionsLoading}
        />
      </div>

      <div>
        <SectionLabel>Location &amp; Color</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CENTRALIZED_LOCATION_FIELDS.map((field) =>
            renderField(field, values, update, optionsLoading),
          )}
          {LOCATION_FIELDS.map((field) => renderField(field, values, update))}
        </div>
      </div>

      <div>
        <SectionLabel>Specifications</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SPEC_FIELDS.map((field) => renderField(field, values, update, optionsLoading))}
        </div>
      </div>

      <div>
        <SectionLabel>Ranges</SectionLabel>
        <div className="space-y-4">
          {RANGE_DEFS.map(({ prefix, minKey, maxKey }) => (
            <div key={prefix}>
              <p className="field-label">{prefix}</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  aria-label={`Minimum ${prefix}`}
                  value={values[minKey]}
                  onChange={(e) => update(minKey, e.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  aria-label={`Maximum ${prefix}`}
                  value={values[maxKey]}
                  onChange={(e) => update(maxKey, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Sort</SectionLabel>
        <SearchableSelect
          value={values.sort}
          onChange={(value) => update("sort", value)}
          options={SORT_OPTIONS}
          allowClear={false}
        />
      </div>

      {rangeError && (
        <p role="alert" className="text-danger text-xs -mt-3">
          {rangeError}
        </p>
      )}

      <div className="sticky bottom-0 flex gap-3 border-t border-card bg-white/90 backdrop-blur-md pt-4 pb-1 -mb-1">
        <button
          type="submit"
          className="flex-1 h-12 rounded-xl bg-brass text-graphite-950 font-semibold text-sm shadow-sm transition-all hover:bg-brass-light hover:shadow-card-hover"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="h-12 px-5 rounded-xl border border-card text-ash font-semibold text-sm transition-colors hover:border-brass hover:text-brass-dark"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export { emptyFilters };
