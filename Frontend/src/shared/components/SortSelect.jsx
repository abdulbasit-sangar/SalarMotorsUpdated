import { Select } from "./Input.jsx";
import { SORT_OPTIONS } from "../../services/cars/carsApi.js";

export const SortSelect = ({ value, onChange }) => (
  <div className="w-full sm:w-56">
    <Select
      aria-label="Sort listings"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          Sort: {opt.label}
        </option>
      ))}
    </Select>
  </div>
);
