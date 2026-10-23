import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "../../../shared/components/Button.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
import { useToast } from "../../../store/ui/ToastContext.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import {
  validateCarForm,
  hasErrors,
} from "../../../shared/utils/validators.js";
import {
  countValidImages,
  resolveImageLimits,
} from "../../../shared/utils/imageRules.js";
import { parseApiError } from "../../../services/api/client.js";
import {
  fetchAdminCarById,
  updateCar,
} from "../../../services/cars/carsApi.js";

import { ListingFormSections } from "../listing-form/ListingFormSections.jsx";
import {
  buildUpdatePayload,
  carToForm,
} from "../listing-form/listingFormModel.js";
import { ManageImagesModal } from "../manage-listings/ManageImagesModal.jsx";

const FormSkeleton = () => (
  <div className="space-y-6" aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-full" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    ))}
  </div>
);

// Mounted only after the listing has loaded (and re-mounted per listing via
// `key`), so the form state starts from the saved values with no effects.
function EditListingForm({ car: loadedCar }) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const toast = useToast();
  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useCarOptions();

  const [original] = useState(() => carToForm(loadedCar));
  const [form, setForm] = useState(original);
  const [car, setCar] = useState(loadedCar);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  const imageLimits = resolveImageLimits(options?.imageLimits);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return; // no duplicate submissions

    const errors = validateCarForm(form);
    setFieldErrors(errors);
    setFormError(null);

    if (hasErrors(errors)) {
      toast.error(t("create.fixFields"));
      return;
    }

    const changes = buildUpdatePayload(form, original);
    if (Object.keys(changes).length === 0) {
      toast.info(t("edit.noChanges"));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCar(car._id, changes);
      toast.success(t("edit.success", { title: updated.title }));
      navigate("/admin/listings");
    } catch (err) {
      // Stay on the form with every value the admin entered still in place.
      const parsed = parseApiError(err);
      setFormError(parsed.errors?.length ? parsed.errors : [parsed.message]);
      toast.error(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const statusBadges = [
    car.isHidden ? t("row.hidden") : t("row.visible"),
    car.featured ? t("row.featured") : t("row.notFeatured"),
    car.isSold ? t("row.sold") : t("row.available"),
  ];

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-6 sm:space-y-8">
        {formError && (
          <div
            role="alert"
            className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 space-y-1"
          >
            {formError.map((msg, i) => (
              <p key={i} className="text-danger text-sm break-words">
                {msg}
              </p>
            ))}
          </div>
        )}

        {optionsError && (
          <div
            role="alert"
            className="bg-danger/8 border border-danger/25 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-danger text-sm">{t("create.optionsError")}</p>
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

        {/* Images + status are managed with their existing, separately
            guarded tools so saving details can never alter them. */}
        <section className="glass-panel rounded-premium-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-bone">
            {t("edit.sections.imagesStatus")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadges.map((label) => (
              <span
                key={label}
                className="inline-flex h-7 items-center rounded-full border border-card bg-white/60 px-3 text-xs font-medium text-ash"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-sm text-ash">{t("edit.imagesStatusHint")}</p>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => setImagesOpen(true)}
          >
            {t("row.manageImages", { count: countValidImages(car.images) })}
          </Button>
        </section>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            disabled={saving}
            onClick={() => navigate("/admin/listings")}
          >
            {t("edit.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto"
            loading={saving}
          >
            {t("edit.save")}
          </Button>
        </div>
      </form>

      <ManageImagesModal
        car={imagesOpen ? car : null}
        onClose={() => setImagesOpen(false)}
        onUpdated={(updated) =>
          setCar((prev) => ({ ...prev, images: updated.images }))
        }
        limits={imageLimits}
      />
    </>
  );
}

export default function EditListingPage() {
  const { t } = useTranslation("admin");
  const { id } = useParams();

  const fetcher = useCallback(() => fetchAdminCarById(id), [id]);
  const { data: car, loading, error, refetch } = useAsyncData(fetcher, [id]);

  return (
    <div className="container-page py-8 sm:py-10 max-w-3xl">
      <Link
        to="/admin/listings"
        className="mb-4 inline-flex min-h-10 items-center text-sm font-medium text-ash hover:text-brass-dark"
      >
        ← {t("edit.back")}
      </Link>

      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {t("create.eyebrow")}
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-bone mb-6 sm:mb-8 break-words">
        {t("edit.title")}
        {car?.title ? ` — ${car.title}` : ""}
      </h1>

      {loading ? (
        <FormSkeleton />
      ) : error || !car ? (
        <div className="rounded-2xl border border-card bg-card">
          <ErrorState
            title={t("edit.loadErrorTitle")}
            description={error?.message ?? t("edit.loadError")}
            onRetry={refetch}
          />
        </div>
      ) : (
        <EditListingForm key={car._id} car={car} />
      )}
    </div>
  );
}
