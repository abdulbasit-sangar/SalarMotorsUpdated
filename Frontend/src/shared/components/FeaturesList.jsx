import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../i18n/optionLabels.js";
import { CheckIcon, BoltIcon } from "./icons.jsx";

/**
 * FeaturesList — details-page display. All feature groups live inside one
 * box; each group keeps its title, with its features as small badges
 * underneath. Same layout on all devices. Renders nothing if the vehicle
 * has no features (old listings created before this feature shipped simply
 * default to an empty array — see car.model.js).
 */
export const FeaturesList = ({ featureGroups, selectedFeatures }) => {
  const { t } = useTranslation();
  const label = useOptionLabel();
  const selected = new Set(selectedFeatures || []);
  if (!selected.size) return null;

  const groups = (featureGroups || [])
    .map((g) => ({
      group: g.group,
      features: g.features.filter((f) => selected.has(f)),
    }))
    .filter((g) => g.features.length > 0);

  if (!groups.length) return null;

  const total = groups.reduce((count, g) => count + g.features.length, 0);

  return (
    <div className="mt-8">
      <div className="glass-panel rounded-premium-lg p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brass/20 bg-brass/10 text-brass-dark">
            <BoltIcon className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-bone">
            {t("features.title")}
          </h2>
          <span
            aria-hidden="true"
            className="chip-glass !py-0.5 font-mono"
          >
            {total}
          </span>
        </div>

        {groups.map((g, groupIndex) => (
          <div key={g.group}>
            {groupIndex > 0 && (
              <div
                aria-hidden="true"
                className="border-t border-card my-5"
              />
            )}
            <p className="flex items-center gap-2 mb-2.5">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-brass shrink-0"
              />
              <span className="font-display text-[13px] font-bold text-bone uppercase tracking-wider">
                {label("featureGroup", g.group)}
              </span>
            </p>
            <ul className="flex flex-wrap gap-2">
              {g.features.map((feature) => (
                <li key={feature} className="chip-glass !px-3 !py-1.5 !text-[13px]">
                  <CheckIcon className="h-3.5 w-3.5 text-icon-success shrink-0" />
                  <span>{label("feature", feature)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
