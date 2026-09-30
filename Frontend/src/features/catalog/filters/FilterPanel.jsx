import { useState } from "react";
import { Input } from "../../../shared/components/Input.jsx";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";

export const emptyFilters = () => ({
  brand: "",
  model: "",
  province: "",
  color: "",
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

export const FilterPanel = ({ initialValues, onApply, onReset }) => {
  const [values, setValues] = useState({
    ...emptyFilters(),
    ...initialValues,
  });

  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useCarOptions();

  const update = (key, value) => {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateBrand = (brand) => {
    setValues((previous) => ({
      ...previous,
      brand,
      model: "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onApply(values);
  };

  const handleReset = () => {
    const cleared = emptyFilters();
    setValues(cleared);
    onReset(cleared);
  };

  const yearOptions = (options?.years ?? []).map((year) => ({
    value: String(year),
    label: String(year),
  }));

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {optionsError && (
        <div
          role="alert"
          className="
            flex
            items-start
            justify-between
            gap-3
            rounded-xl
            border
            border-danger/20
            bg-danger/5
            px-3
            py-2.5
          "
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
            className="
              shrink-0
              rounded-lg
              px-2
              py-1
              text-xs
              font-semibold
              text-danger
              transition-colors
              hover:bg-danger/10
            "
          >
            Retry
          </button>
        </div>
      )}

      <SearchableSelect
        label="Brand"
        value={values.brand}
        onChange={updateBrand}
        options={(options?.brands ?? []).map((brand) => ({
          value: brand,
          label: brand,
        }))}
        placeholder={optionsLoading ? "Loading…" : "Any brand"}
        disabled={optionsLoading}
      />

      <SearchableSelect
        id="filter-model"
        label="Model"
        value={values.model}
        onChange={(model) => update("model", model)}
        options={(options?.modelsByBrand?.[values.brand] ?? []).map(
          (model) => ({
            value: model,
            label: model,
          }),
        )}
        placeholder={values.brand ? "Any model" : "Select brand first"}
        disabled={!values.brand}
        disabledLabel="Select brand first"
      />

      <SearchableSelect
        label="Location"
        value={values.province}
        onChange={(province) => update("province", province)}
        options={(options?.provinces ?? []).map((province) => ({
          value: province,
          label: province,
        }))}
        placeholder={optionsLoading ? "Loading…" : "Any location"}
        disabled={optionsLoading}
      />

      <Input
        label="Color"
        placeholder="e.g. White, Black"
        value={values.color}
        onChange={(event) => update("color", event.target.value)}
      />

      <div className="grid w-full grid-cols-2 gap-3">
        <SearchableSelect
          label="Min Year"
          value={values.minYear}
          onChange={(year) => update("minYear", year)}
          options={yearOptions}
          placeholder={optionsLoading ? "Loading…" : "Any year"}
          disabled={optionsLoading}
        />

        <SearchableSelect
          label="Max Year"
          value={values.maxYear}
          onChange={(year) => update("maxYear", year)}
          options={yearOptions}
          placeholder={optionsLoading ? "Loading…" : "Any year"}
          disabled={optionsLoading}
        />
      </div>

      <div className="flex gap-3 border-t border-card pt-4">
        <button
          type="submit"
          className="
            flex
            h-10
            flex-1
            items-center
            justify-center
            rounded-xl
            bg-brass
            px-4
            text-sm
            font-semibold
            text-graphite-950
            shadow-sm
            transition-all
            hover:bg-brass-light
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-brass/50
          "
        >
          Apply Filters
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="
            h-10
            shrink-0
            rounded-xl
            border
            border-card
            bg-white
            px-4
            text-sm
            font-semibold
            text-ash
            transition-all
            hover:border-brass/40
            hover:text-bone
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-brass/40
          "
        >
          Reset
        </button>
      </div>
    </form>
  );
};