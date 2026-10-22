
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../shared/components/Modal.jsx";
import { FeaturesSelector } from "../../../shared/components/FeaturesSelector.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";

export const EditFeaturesModal = ({
  car,
  onClose,
  onSave,
  saving,
}) => {
  const { t } = useTranslation("admin");
  const { options } = useCarOptions();
  const [selected, setSelected] = useState(car?.features ?? []);

  if (!car) return null;

  return (
    <Modal
      open={!!car}
      onClose={onClose}
      title={t("featuresModal.title", {
        name: car.title || car.model,
      })}
    >
      <div className="max-h-[65vh] overflow-y-auto overscroll-contain pe-1">
        <FeaturesSelector
          featureGroups={options?.featureGroups ?? []}
          selected={selected}
          onChange={setSelected}
        />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-card pt-4 sm:flex-row sm:justify-end sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={saving}
        >
          {t("featuresModal.cancel")}
        </Button>

        <Button
          type="button"
          variant="primary"
          loading={saving}
          onClick={() => onSave(car, selected)}
        >
          {t("featuresModal.save")}
        </Button>
      </div>
    </Modal>
  );
};
