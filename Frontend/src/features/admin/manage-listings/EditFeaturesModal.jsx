import { useState } from "react";
import { Modal } from "../../../shared/components/Modal.jsx";
import { FeaturesSelector } from "../../../shared/components/FeaturesSelector.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";

/**
 * EditFeaturesModal — lets Admin/Manager add/remove a vehicle's Features
 * after it's been listed (spec requirement #4). Previously selected
 * features arrive pre-checked via `car.features` (Car.features on the
 * server) — there's no separate "load" step since the car object is
 * already in memory from the listings list.
 */
export const EditFeaturesModal = ({ car, onClose, onSave, saving }) => {
  const { options } = useCarOptions();
  const [selected, setSelected] = useState(car?.features ?? []);

  if (!car) return null;

  return (
    <Modal open={!!car} onClose={onClose} title={`Edit Features — ${car.title || car.model}`}>
      <FeaturesSelector
        featureGroups={options?.featureGroups ?? []}
        selected={selected}
        onChange={setSelected}
      />

      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          variant="primary"
          loading={saving}
          onClick={() => onSave(car, selected)}
        >
          Save Features
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
