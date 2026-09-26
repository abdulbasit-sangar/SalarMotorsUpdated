import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";
import {
  SearchIcon,
  ArrowRightIcon,
  CarSilhouetteIcon,
  CalendarIcon,
  MapPinIcon,
  SteeringWheelIcon,
} from "../../../shared/components/icons.jsx";

export const HeroSearchBar = ({ className }) => {
  const navigate = useNavigate();
  const { options, loading: optionsLoading } = useCarOptions();

  const [values, setValues] = useState({
    brand: "",
    minYear: "",
    steeringType: "",
    province: "",
  });

  // Mount-triggered entrance state for the field grid.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Order matches the required layout:
  // Mobile:   one field per row (Brand, Year, Location, Steering)
  // Tablet:   2 columns
  // Desktop:  Brand | Year | Location | Steering (one row)
  const FILTER_FIELDS = [
    {
      key: "brand",
      label: "Brand",
      icon: CarSilhouetteIcon,
      placeholder: optionsLoading ? "Loading…" : "Any brand",
      options: (options?.brands ?? []).map((v) => ({ value: v, label: v })),
    },
    {
      key: "minYear",
      label: "Year",
      icon: CalendarIcon,
      placeholder: optionsLoading ? "Loading…" : "Any year",
      options: (options?.years ?? []).map((v) => ({ value: String(v), label: String(v) })),
    },
    {
      key: "province",
      label: "Location",
      icon: MapPinIcon,
      placeholder: optionsLoading ? "Loading…" : "Any province",
      options: (options?.provinces ?? []).map((v) => ({ value: v, label: v })),
    },
    {
      key: "steeringType",
      label: "Steering",
      icon: SteeringWheelIcon,
      placeholder: optionsLoading ? "Loading…" : "Any",
      options: (options?.steering ?? []).map((v) => ({ value: v, label: v })),
    },
  ];

  const update = (key, value) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== "" && value != null) params.set(key, value);
    });
    navigate(`/listings?${params.toString()}`);
  };

  // No `mx-auto`: the bar starts at the container's left edge so it lines up
  // with the logo and headline. Pass `className="mx-auto"` where a centered
  // bar is needed.
  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={clsx(
        "glass-panel-strong rounded-premium-lg p-4 sm:p-6 w-full max-w-4xl",
        "transition-all duration-700 ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {FILTER_FIELDS.map((field, index) => (
          <div
            key={field.key}
            style={{ transitionDelay: mounted ? `${100 + index * 80}ms` : "0ms" }}
            className={clsx(
              "min-w-0 transition-all duration-500 ease-out",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <SearchableSelect
              id={`hero-${field.key}`}
              label={field.label}
              icon={field.icon}
              value={values[field.key]}
              onChange={(value) => update(field.key, value)}
              options={field.options}
              placeholder={field.placeholder}
              disabled={optionsLoading}
            />
          </div>
        ))}
      </div>

      <div
        style={{ transitionDelay: mounted ? "420ms" : "0ms" }}
        className={clsx(
          "mt-4 sm:mt-5 flex justify-end transition-all duration-500 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-8 bg-brass text-graphite-950 font-semibold text-sm rounded-xl sm:rounded-2xl transition-all duration-200 ease-out hover:bg-brass-light hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.96]"
        >
          <SearchIcon className="h-4 w-4 transition-transform duration-200 ease-out group-hover:scale-110" />
          Search Cars
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
};
