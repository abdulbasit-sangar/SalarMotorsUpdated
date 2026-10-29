
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../../i18n/optionLabels.js";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import { SearchableSelect } from "../../../shared/components/SearchableSelect.jsx";
import {
  SearchIcon,
  ArrowRightIcon,
  CarSilhouetteIcon,
  CalendarIcon,
  MapPinIcon,
  SearchIcon as ModelIcon,
} from "../../../shared/components/icons.jsx";

export const HeroSearchBar = ({ className }) => {
  const { t } = useTranslation("home");
  const loadingText = useTranslation().t("select.loading");
  const label = useOptionLabel();
  const navigate = useNavigate();
  const { options, loading: optionsLoading } = useCarOptions();

  const [values, setValues] = useState({
    brand: "",
    model: "",
    minYear: "",
    province: "",
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const FILTER_FIELDS = [
    {
      key: "brand",
      label: t("search.brand"),
      icon: CarSilhouetteIcon,
      options: (options?.brands ?? []).map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "model",
      label: t("search.model"),
      icon: ModelIcon,
      disabled: !values.brand || optionsLoading,
      options: (options?.modelsByBrand?.[values.brand] ?? []).map(
        (model) => ({
          value: model,
          label: model,
        }),
      ),
    },
    {
      key: "minYear",
      label: t("search.year"),
      icon: CalendarIcon,
      options: (options?.years ?? []).map((v) => ({
        value: String(v),
        label: String(v),
      })),
    },
    {
      key: "province",
      label: t("search.location"),
      icon: MapPinIcon,
      options: (options?.provinces ?? []).map((v) => ({
        value: v,
        label: label("province", v),
      })),
    },
  ];

  const update = (key, value) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "brand" ? { model: "" } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const params = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "" && value != null) {
        params.set(key, value);
      }
    });

    // The home search bar's year picker means "exactly this year", not
    // "from this year onward". Pinning both ends of the range makes the
    // backend return only cars of the selected year.
    if (values.minYear) {
      params.set("maxYear", values.minYear);
    }

    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section
      aria-label="Find your vehicle"
      className={clsx(
        "relative -top-8 w-full max-w-7xl",
        "transition-opacity duration-500 ease-out",
        mounted ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div
        className={clsx(
          "relative rounded-2xl sm:rounded-3xl",
          "border border-white/25",
          "bg-white/[0.12] backdrop-blur-xl",
          "p-3 sm:p-5 lg:p-6",
          "shadow-[0_12px_40px_rgba(0,0,0,0.16)]",
        )}
      >
        <h2 className="mb-4 text-xl font-bold tracking-tight text-white sm:mb-5 sm:text-2xl lg:text-3xl">
          Find Your Dream Car
        </h2>

        <form
          onSubmit={handleSubmit}
          role="search"
          className={clsx(
            "grid grid-cols-2 gap-2",
            "sm:gap-3",
            "lg:grid-cols-4",
          )}
        >
          {FILTER_FIELDS.map((field, index) => (
            <div
              key={field.key}
              style={{
                transitionDelay: mounted ? `${index * 50}ms` : "0ms",
              }}
              className={clsx(
                "relative min-w-0 rounded-xl",
                "transition-[background-color,opacity,transform] duration-300",
                "focus-within:bg-white/[0.05]",
                mounted
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0",
              )}
            >
              <div className="flex min-h-12 items-center">
                <div className="min-w-0 w-full flex-1">
                  <SearchableSelect
                    id={`hero-${field.key}`}
                    label={field.label}
                    icon={field.icon}
                    value={values[field.key]}
                    onChange={(value) => update(field.key, value)}
                    options={field.options}
                    placeholder={optionsLoading ? loadingText : ""}
                    disabled={field.disabled ?? optionsLoading}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="col-span-2 lg:col-span-4">
            <button
              type="submit"
              className={clsx(
                "group inline-flex h-12 w-full items-center justify-center gap-2",
                "rounded-xl px-5",
                "bg-[#D9AD68] text-[#17130D]",
                "text-sm font-semibold tracking-wide",
                "transition-[background-color,transform,box-shadow] duration-200",
                "hover:bg-[#E5C18B]",
                "hover:shadow-[0_5px_18px_rgba(217,173,104,0.22)]",
                "active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#E5C18B] focus-visible:ring-offset-2",
                "focus-visible:ring-offset-transparent",
              )}
            >
              <SearchIcon
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>Search Car</span>
              <ArrowRightIcon
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
