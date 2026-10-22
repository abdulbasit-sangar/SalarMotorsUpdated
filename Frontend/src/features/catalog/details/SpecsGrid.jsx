import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../../i18n/optionLabels.js";
import {
  formatDate,
  formatMileage,
  formatPrice,
  carLocation,
} from "../../../shared/utils/format.js";
import {
  CalendarIcon,
  GaugeIcon,
  FuelIcon,
  GearIcon,
  EngineIcon,
  MapPinIcon,
} from "../../../shared/components/icons.jsx";

const SpecCell = ({ icon: Icon, label, value }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-card">
      <span className="flex items-center gap-2 text-ash text-xs uppercase tracking-wider">
        {Icon && <Icon className="w-4 h-4 text-brass-dark shrink-0" />}
        {label}
      </span>
      <span className="text-bone text-sm font-mono text-end">{value}</span>
    </div>
  );
};

/**
 * SpecsGrid — the "Specification" section (spec requirement #15), rendered
 * directly below the image gallery on the details page (see
 * CarDetailsPage.jsx). Covers every field the spec calls out — Make/Model/
 * Year/Price+Currency/Mileage+Unit/Fuel/Transmission/Engine/
 * Condition/Color/VIN/Province+City/Import date — in one place, so it's
 * intentionally the ONLY place these are repeated (title/price panel above
 * it stay focused on the at-a-glance figures, not a full spec dump).
 */
export const SpecsGrid = ({ car }) => {
  const { t } = useTranslation("catalog");
  const label = useOptionLabel();
  return (
  <div className="grid sm:grid-cols-2 gap-x-10">
    <div>
      <SpecCell label={t("specs.brand")} value={car.brand} />
      <SpecCell label={t("specs.model")} value={car.model} />
      <SpecCell icon={CalendarIcon} label={t("specs.year")} value={car.year} />
      <SpecCell label={t("specs.price")} value={formatPrice(car.price, car.currency)} />
      <SpecCell
        icon={GaugeIcon}
        label={t("specs.mileage")}
        value={formatMileage(car.mileage, car.mileageUnit)}
      />
      <SpecCell
        label={t("specs.condition")}
        value={label("condition", car.condition)}
      />
      <SpecCell label={t("specs.color")} value={car.color} />
    </div>
    <div>
      <SpecCell icon={FuelIcon} label={t("specs.fuelType")}
        value={label("fuelType", car.fuelType)} />
      <SpecCell
        label={t("specs.bodyType")}
        value={label("bodyType", car.bodyType)}
      />
      <SpecCell icon={GearIcon} label={t("specs.transmission")}
        value={label("transmission", car.transmission)} />
      <SpecCell
        icon={EngineIcon}
        label={t("specs.engine")}
        value={car.engineCC ? t("specs.engineCc", { value: car.engineCC }) : null}
      />
      <SpecCell icon={MapPinIcon} label={t("specs.location")} value={carLocation(car)} />
      <SpecCell
        label={t("specs.vin")}
        value={car.vin ? <span className="ltr-isolate">{car.vin}</span> : null}
      />
      <SpecCell
        icon={CalendarIcon}
        label={t("specs.imported")}
        value={formatDate(car.importedDate)}
      />
    </div>
  </div>
  );
};
