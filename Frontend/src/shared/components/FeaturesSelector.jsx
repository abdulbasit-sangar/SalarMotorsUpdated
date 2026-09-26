import { useState } from "react";
import clsx from "clsx";
import { CheckSquareIcon, SquareIcon, ChevronDownIcon } from "./icons.jsx";

/**
 * FeaturesSelector — grouped checkbox picker for Vehicle Features.
 * `featureGroups` comes from GET /api/cars/options (single source of truth
 * — see backend/constants/car.constants.js), never hardcoded here.
 * `selected` / `onChange` follow the same controlled-array pattern as the
 * rest of the create-listing form.
 */
export const FeaturesSelector = ({ featureGroups = [], selected = [], onChange }) => {
  const [openGroups, setOpenGroups] = useState(() => new Set(featureGroups.map((g) => g.group)));
  const selectedSet = new Set(selected);

  const toggleGroup = (group) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const toggleFeature = (feature) => {
    if (selectedSet.has(feature)) {
      onChange(selected.filter((f) => f !== feature));
    } else {
      onChange([...selected, feature]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="field-label mb-0">Vehicle Features</h3>
        {selected.length > 0 && (
          <span className="text-xs text-ash font-mono">{selected.length} selected</span>
        )}
      </div>

      <div className="space-y-2">
        {featureGroups.map(({ group, features }) => {
          const isOpen = openGroups.has(group);
          const groupSelectedCount = features.filter((f) => selectedSet.has(f)).length;

          return (
            <div key={group} className="border border-card rounded-xl overflow-hidden bg-white/40">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-bone">
                  {group}
                  {groupSelectedCount > 0 && (
                    <span className="ml-2 text-xs font-mono text-brass-dark">
                      ({groupSelectedCount})
                    </span>
                  )}
                </span>
                <ChevronDownIcon
                  className={clsx(
                    "h-4 w-4 text-ash transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-4 pb-4">
                  {features.map((feature) => {
                    const checked = selectedSet.has(feature);
                    return (
                      <label
                        key={feature}
                        className={clsx(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm cursor-pointer select-none transition-colors",
                          checked ? "bg-brass/10 text-brass-dark" : "text-ash hover:bg-graphite-800",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleFeature(feature)}
                        />
                        {checked ? (
                          <CheckSquareIcon className="h-[18px] w-[18px] text-brass shrink-0" />
                        ) : (
                          <SquareIcon className="h-[18px] w-[18px] text-steel shrink-0" />
                        )}
                        <span className="truncate">{feature}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
