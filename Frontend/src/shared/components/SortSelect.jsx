import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../i18n/optionLabels.js";
import { Select } from "./Input.jsx";
import { SORT_OPTIONS } from "../../services/cars/carsApi.js";

export const SortSelect = ({ value, onChange }) => {
  const { t } = useTranslation();
  const label = useOptionLabel();
  return (
    <div className="w-full sm:w-56">
      <Select
        aria-label={t("sort.aria")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t("sort.prefix", { label: label("sort", opt.value) })}
          </option>
        ))}
      </Select>
    </div>
  );
};
