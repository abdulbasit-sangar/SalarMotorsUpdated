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
      <span className="text-bone text-sm font-mono text-right">{value}</span>
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
export const SpecsGrid = ({ car }) => (
  <div className="grid sm:grid-cols-2 gap-x-10">
    <div>
      <SpecCell label="Brand" value={car.brand} />
      <SpecCell label="Model" value={car.model} />
      <SpecCell icon={CalendarIcon} label="Year" value={car.year} />
      <SpecCell label="Price" value={formatPrice(car.price, car.currency)} />
      <SpecCell
        icon={GaugeIcon}
        label="Mileage"
        value={formatMileage(car.mileage, car.mileageUnit)}
      />
      <SpecCell label="Condition" value={car.condition} />
      <SpecCell label="Color" value={car.color} />
    </div>
    <div>
      <SpecCell icon={FuelIcon} label="Fuel Type" value={car.fuelType} />
      <SpecCell label="Body Type" value={car.bodyType} />
      <SpecCell icon={GearIcon} label="Transmission" value={car.transmission} />
      <SpecCell
        icon={EngineIcon}
        label="Engine"
        value={car.engineCC ? `${car.engineCC} cc` : null}
      />
      <SpecCell icon={MapPinIcon} label="Location" value={carLocation(car)} />
      <SpecCell label="VIN" value={car.vin} />
      <SpecCell
        icon={CalendarIcon}
        label="Imported"
        value={formatDate(car.importedDate)}
      />
    </div>
  </div>
);
