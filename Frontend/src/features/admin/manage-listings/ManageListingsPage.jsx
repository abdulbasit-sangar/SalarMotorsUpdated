import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
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
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const sort = searchParams.get("sort") || "newest";

  const fetcher = useCallback(
    () => fetchAdminCars({ page, limit: LIMIT, sort }),
    [page, sort],
  );
  const { data, loading, error, refetch } = useAsyncData(fetcher, [page, sort]);

  // Cars are mirrored into local state so that hiding a listing doesn't
  // make it vanish mid-session — see the note below the header. Toggling
  // updates this local copy directly instead of refetching, since the
  // backend's public GET /cars excludes isHidden:true results entirely.
  const [cars, setCars] = useState([]);
  const [pendingId, setPendingId] = useState(null);
  const [editingFeaturesCar, setEditingFeaturesCar] = useState(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [managingImagesCar, setManagingImagesCar] = useState(null);

  useEffect(() => {
    if (data?.cars)
      setCars(data.cars.map((c) => ({ ...c, isHidden: c.isHidden ?? false })));
  }, [data]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  };

  const handleToggleFeatured = async (car) => {
    setPendingId({ id: car._id, action: "feature" });
    try {
      const updated = await toggleFeatureCar(car._id);
      setCars((prev) =>
        prev.map((c) =>
          c._id === car._id ? { ...c, featured: updated.featured } : c,
        ),
      );
      toast.success(
        updated.featured ? "Marked as featured." : "Removed from featured.",
      );
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleToggleHide = async (car) => {
    setPendingId({ id: car._id, action: "hide" });
    try {
      const updated = await toggleHideCar(car._id);
      setCars((prev) =>
        prev.map((c) =>
          c._id === car._id ? { ...c, isHidden: updated.isHidden } : c,
        ),
      );
      toast.success(
        updated.isHidden
          ? "Pictures hidden successfully."
          : "Pictures restored successfully.",
      );
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (car) => {
    const confirmed = window.confirm(
      `Delete "${car.title || "this listing"}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingId({ id: car._id, action: "delete" });
    try {
      await deleteCar(car._id);
      setCars((prev) => prev.filter((c) => c._id !== car._id));
      toast.success("Listing deleted successfully.");
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
      setCars((prev) =>
        prev.map((c) => (c._id === car._id ? { ...c, isSold: updated.isSold } : c)),
      );
      toast.success(updated.isSold ? "Marked as sold." : "Marked as available.");
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
      setCars((prev) =>
        prev.map((c) => (c._id === car._id ? { ...c, features: updated.features } : c)),
      );
      toast.success("Vehicle features updated.");
      setEditingFeaturesCar(null);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleImagesUpdated = (updated) => {
    setCars((prev) =>
      prev.map((c) => (c._id === updated._id ? { ...c, images: updated.images } : c)),
    );
    setManagingImagesCar((prev) =>
      prev && prev._id === updated._id ? { ...prev, images: updated.images } : prev,
    );
  };

  const handlePageChange = (nextPage) => {
    updateParams({ page: nextPage === 1 ? null : nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
            Inventory
          </p>
          <h1 className="font-display text-4xl font-semibold text-bone">Manage Listings</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            as={Link}
            to="/admin/listings/create"
            variant="primary"
            size="sm"
          >
            + Create Listing
          </Button>
          <SortSelect
            value={sort}
            onChange={(value) => updateParams({ sort: value, page: null })}
          />
        </div>
      </div>

      <div className="bg-brass/8 border border-brass/25 rounded-xl px-4 py-3 mb-8 text-xs text-ash">
        <strong className="text-brass-dark">Note:</strong> hidden listings remain
        visible in this admin list and can be restored with the Unhide button.
      </div>

      {error ? (
        <ErrorState onRetry={refetch} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : cars.length ? (
        <>
          <div className="space-y-3">
            {cars.map((car) => (
              <AdminCarRow
                key={car._id}
                car={car}
                pending={pendingId?.id === car._id ? pendingId.action : null}
                onToggleFeatured={handleToggleFeatured}
                onToggleHide={handleToggleHide}
                onToggleSold={handleToggleSold}
                onEditFeatures={setEditingFeaturesCar}
                onManageImages={setManagingImagesCar}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              pagination={data.pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={<CarSilhouetteIcon className="w-14 h-9" />}
          title="No listings yet"
          description="Create your first listing to start managing inventory."
          actionLabel="Create Listing"
          onAction={() => (window.location.href = "/admin/listings/create")}
        />
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
      />
    </div>
  );
}
