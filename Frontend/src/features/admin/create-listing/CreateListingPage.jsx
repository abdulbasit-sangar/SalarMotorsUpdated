import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/components/Button.jsx";

import { ImageUploader } from "../../../shared/components/ImageUploader.jsx";
import { ImageCountStatus } from "../../../shared/components/ImageCountStatus.jsx";
import {
  resolveImageLimits,
  countSelectableFiles,
  getPublishStatus,
  getPublishMessages,
} from "../../../shared/utils/imageRules.js";

import { ListingFormSections } from "../listing-form/ListingFormSections.jsx";

import { useToast } from "../../../store/ui/ToastContext.jsx";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { areaPath } from "../../../shared/utils/areaPath.js";

import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";

import {
  validateCarForm,
  hasErrors,
} from "../../../shared/utils/validators.js";

import { parseApiError } from "../../../services/api/client.js";

import {
  createCar,
  waitForCreationStatus,
} from "../../../services/cars/carsApi.js";

const INITIAL_FORM = {
  title: "",
  brand: "",
  model: "",
  year: "",
  price: "",
  currency: "USD",
  province: "",
  city: "",
  mileage: "",
  mileageUnit: "km",
  fuelType: "",
  bodyType: "",
  transmission: "",
  condition: "",
  engineCC: "",
  color: "",
  vin: "",
  sellerPhone: "",
  sellerWhatsapp: "",
  sellerLocation: "",
  description: "",
  importedDate: "",
  features: [],
};

export default function CreateListingPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const toast = useToast();
  const { admin } = useAuth();
  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useCarOptions();

  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const creationRequestId = useRef(crypto.randomUUID());

  // Creating a listing publishes it, so it needs the minimum number of
  // images. Only real, non-empty selected files count; the backend re-checks
  // everything after the upload and is the final authority.
  const imageLimits = resolveImageLimits(options?.imageLimits);
  const publishStatus = getPublishStatus(
    countSelectableFiles(images),
    imageLimits,
  );
  const publishText = getPublishMessages(t, publishStatus);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateCarForm(form);

    setFieldErrors(errors);
    setFormError(null);

    if (hasErrors(errors)) {
      toast.error(t("create.fixFields"));
      return;
    }

    if (!publishStatus.canPublish) {
      // Also covers keyboard submission, which a disabled button alone
      // would not explain.
      setFormError([publishText.requirementMessage, publishText.missingMessage]);
      toast.error(publishText.requirementMessage);
      return;
    }

    setSubmitting(true);

    try {
      const car = await createCar(form, images, creationRequestId.current);

      toast.success(t("create.success", { title: car.title }));

      navigate(areaPath(admin?.role, "/listings"));
    } catch (err) {
      if (!err?.response) {
        try {
          const statusCar = await waitForCreationStatus(
            creationRequestId.current,
          );
          toast.success(t("create.success", { title: statusCar.title }));
          navigate(areaPath(admin?.role, "/listings"));
          return;
        } catch {
          // The original network error remains the actionable result.
        }
      }
      // Rotate the idempotency key so a *changed* resubmission isn't judged
      // against this failed attempt's request hash (see listingCreation
      // .service.js beginListingCreation — same key + different data = 409).
      creationRequestId.current = crypto.randomUUID();

      const parsed = parseApiError(err);

      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);

      toast.error(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-8 sm:py-10 max-w-3xl">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {t("create.eyebrow")}
      </p>

      <h1 className="font-display text-4xl font-semibold text-bone mb-8">
        {t("create.title")}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {formError && (
          <div
            role="alert"
            className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 space-y-1"
          >
            {formError.map((msg, i) => (
              <p key={i} className="text-danger text-sm">
                {msg}
              </p>
            ))}
          </div>
        )}

        {optionsError && (
          <div
            role="alert"
            className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <p className="text-danger text-sm">
              {t("create.optionsError")}
            </p>
            <button
              type="button"
              onClick={refetchOptions}
              className="text-danger text-sm font-semibold underline shrink-0"
            >
              {t("create.retry")}
            </button>
          </div>
        )}

        <ListingFormSections
          form={form}
          setForm={setForm}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          options={options}
          optionsLoading={optionsLoading}
        />

        {/* ==================== IMAGES ==================== */}

        <section className="glass-panel rounded-premium-lg p-5 sm:p-6">
          <ImageUploader
            files={images}
            onChange={setImages}
            limits={imageLimits}
          />
          <ImageCountStatus
            id="image-requirement"
            className="mt-4"
            count={publishStatus.count}
            limits={imageLimits}
            needsPublish
          />
        </section>

        {/* ==================== ACTIONS ==================== */}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!publishStatus.canPublish}
            aria-describedby="image-requirement"
          >
            {t("create.publish")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(areaPath(admin?.role, "/listings"))}
          >
            {t("create.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
