import { CheckIcon } from "./icons.jsx";

/**
 * FeaturesList — details-page display. Groups `selectedFeatures` (an array
 * of feature strings from Car.features) under the same category labels used
 * in FeaturesSelector, but only renders groups/features that are actually
 * present on this vehicle — never the full catalog. Renders nothing if the
 * vehicle has no features (old listings created before this feature shipped
 * simply default to an empty array — see car.model.js).
 */
export const FeaturesList = ({ featureGroups, selectedFeatures }) => {
  const selected = new Set(selectedFeatures || []);
  if (!selected.size) return null;

  const groups = (featureGroups || [])
    .map((g) => ({
      group: g.group,
      features: g.features.filter((f) => selected.has(f)),
    }))
    .filter((g) => g.features.length > 0);

  if (!groups.length) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-semibold text-bone mb-4">Features</h2>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
        {groups.map((g) => (
          <div key={g.group}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-brass mb-2">
              {g.group}
            </p>
            <ul className="space-y-1.5">
              {g.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-ash">
                  <CheckIcon className="h-3.5 w-3.5 text-signal shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
