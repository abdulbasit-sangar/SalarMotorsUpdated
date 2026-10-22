
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { useCarOptions } from "../../../shared/hooks/useCarOptions.js";
import {
  resolveImageLimits,
  countValidImages,
  getPublishStatus,
  getPublishMessages,
} from "../../../shared/utils/imageRules.js";
import {
  deleteCar,
  fetchAdminCars,
  toggleFeatureCar,
  toggleHideCar,
  toggleSoldCar,
  updateCarFeatures,
} from "../../../services/cars/carsApi.js";
import { AdminCarRow } from "./AdminCarRow.jsx";
import { EditFeaturesModal } from "./EditFeaturesModal.jsx";
import { ManageImagesModal } from "./ManageImagesModal.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { SortSelect } from "../../../shared/components/SortSelect.jsx";
import { Pagination } from "../../../shared/components/Pagination.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";
import { useToast } from "../../../store/ui/ToastContext.jsx";
import { parseApiError } from "../../../services/api/client.js";

const LIMIT = 10;

export default function ManageListingsPage() {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const sort = searchParams.get("sort") || "newest";

  const fetcher = useCallback(
    () => fetchAdminCars({ page, limit: LIMIT, sort }),
    [page, sort],
  );

  const { data, loading, error, refetch } = useAsyncData(fetcher, [
    page,
    sort,
  ]);

  const { options } = useCarOptions();
  const imageLimits = resolveImageLimits(options?.imageLimits);

  const [cars, setCars] = useState([]);
  const [pendingId, setPendingId] = useState(null);
  const [editingFeaturesCar, setEditingFeaturesCar] = useState(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [managingImagesCar, setManagingImagesCar] = useState(null);

  useEffect(() => {
    if (data?.cars) {
      setCars(
        data.cars.map((car) => ({
          ...car,
          isHidden: car.isHidden ?? false,
        })),
      );
    }
  }, [data]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    setSearchParams(params);
  };

  const handleToggleFeatured = async (car) => {
    setPendingId({ id: car._id, action: "feature" });

    try {
      const updated = await toggleFeatureCar(car._id);

      setCars((previous) =>
        previous.map((item) =>
          item._id === car._id
            ? { ...item, featured: updated.featured }
            : item,
        ),
      );

      toast.success(
        updated.featured
          ? t("listings.markedFeatured")
          : t("listings.removedFeatured"),
      );
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleToggleHide = async (car) => {
    if (car.isHidden) {
      const status = getPublishStatus(
        countValidImages(car.images),
        imageLimits,
      );

      if (!status.canPublish) {
        const messages = getPublishMessages(t, status);
        toast.error(
          `${messages.requirementMessage} ${messages.missingMessage}`,
        );
        return;
      }
    }

    setPendingId({ id: car._id, action: "hide" });

    try {
      const updated = await toggleHideCar(car._id);

      setCars((previous) =>
        previous.map((item) =>
          item._id === car._id
            ? { ...item, isHidden: updated.isHidden }
            : item,
        ),
      );

      toast.success(
        updated.isHidden
          ? t("listings.hiddenToast")
          : t("listings.visibleToast"),
      );
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (car) => {
    const confirmed = window.confirm(
      t("listings.confirmDelete", {
        title: car.title || t("listings.untitled"),
      }),
    );

    if (!confirmed) return;

    setPendingId({ id: car._id, action: "delete" });

    try {
      await deleteCar(car._id);
      setCars((previous) =>
        previous.filter((item) => item._id !== car._id),
      );
      toast.success(t("listings.deleted"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleToggleSold = async (car) => {
    setPendingId({ id: car._id, action: "sold" });

    try {
      const updated = await toggleSoldCar(car._id);

      setCars((previous) =>
        previous.map((item) =>
          item._id === car._id
            ? { ...item, isSold: updated.isSold }
            : item,
        ),
      );

      toast.success(
        updated.isSold
          ? t("listings.markedSold")
          : t("listings.markedAvailable"),
      );
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleSaveFeatures = async (car, features) => {
    setSavingFeatures(true);

    try {
      const updated = await updateCarFeatures(car._id, features);

      setCars((previous) =>
        previous.map((item) =>
          item._id === car._id
            ? { ...item, features: updated.features }
            : item,
        ),
      );

      toast.success(t("listings.featuresUpdated"));
      setEditingFeaturesCar(null);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleImagesUpdated = (updated) => {
    setCars((previous) =>
      previous.map((item) =>
        item._id === updated._id
          ? { ...item, images: updated.images }
          : item,
      ),
    );

    setManagingImagesCar((previous) =>
      previous && previous._id === updated._id
        ? { ...previous, images: updated.images }
        : previous,
    );
  };

  const handlePageChange = (nextPage) => {
    updateParams({ page: nextPage === 1 ? null : nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="container-page min-w-0 py-6 sm:py-8 lg:py-10">
      <header className="mb-6 flex min-w-0 flex-col gap-5 border-b border-card pb-5 sm:mb-8 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brass sm:text-xs">
            {t("listings.eyebrow")}
          </p>

          <h1 className="font-display text-3xl font-semibold leading-tight text-bone sm:text-4xl">
            {t("listings.title")}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:flex lg:shrink-0 lg:items-center">
          <div className="min-w-0">
            <SortSelect
              value={sort}
              onChange={(value) =>
                updateParams({ sort: value, page: null })
              }
            />
          </div>

          <Button
            as={Link}
            to="/admin/listings/create"
            variant="primary"
            size="sm"
          >
            {t("listings.create")}
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-card bg-card p-4 sm:p-6">
          <ErrorState onRetry={refetch} />
        </div>
      ) : loading ? (
        <div className="space-y-3 sm:space-y-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-2xl border border-card bg-card p-3 sm:p-4 lg:flex-row"
            >
              <Skeleton className="aspect-[16/9] w-full rounded-xl sm:aspect-[16/7] lg:aspect-[4/3] lg:w-48 xl:w-56" />

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Skeleton className="h-6 w-3/5 max-w-64" />
                <Skeleton className="h-4 w-2/5 max-w-40" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="mt-1 flex flex-wrap gap-2 border-t border-card pt-3">
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : cars.length > 0 ? (
        <>
          <section
            aria-label={t("listings.title")}
            className="space-y-3 sm:space-y-4"
          >
            {cars.map((car) => (
              <AdminCarRow
                key={car._id}
                car={car}
                pending={
                  pendingId?.id === car._id ? pendingId.action : null
                }
                onToggleFeatured={handleToggleFeatured}
                onToggleHide={handleToggleHide}
                onToggleSold={handleToggleSold}
                onEditFeatures={setEditingFeaturesCar}
                onManageImages={setManagingImagesCar}
                onDelete={handleDelete}
                imageLimits={imageLimits}
              />
            ))}
          </section>

          {data?.pagination && (
            <nav
              aria-label="Listings pagination"
              className="mt-6 overflow-x-auto border-t border-card pt-5 sm:mt-8 sm:pt-6"
            >
              <Pagination
                pagination={data.pagination}
                onPageChange={handlePageChange}
              />
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-card bg-card px-4 py-10 sm:px-6 sm:py-14">
          <EmptyState
            icon={<CarSilhouetteIcon className="h-14 w-14" />}
            title={t("listings.emptyTitle")}
            description={t("listings.emptyDescription")}
            actionLabel={t("listings.emptyAction")}
            onAction={() => {
              window.location.href = "/admin/listings/create";
            }}
          />
        </div>
      )}

      <EditFeaturesModal
        car={editingFeaturesCar}
        onClose={() => setEditingFeaturesCar(null)}
        onSave={handleSaveFeatures}
        saving={savingFeatures}
      />

      <ManageImagesModal
        car={managingImagesCar}
        onClose={() => setManagingImagesCar(null)}
        onUpdated={handleImagesUpdated}
        limits={imageLimits}
      />
    </main>
  );
}
