
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../shared/components/Modal.jsx";
import { ImageUploader } from "../../../shared/components/ImageUploader.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { ImageCountStatus } from "../../../shared/components/ImageCountStatus.jsx";
import {
  IMAGE_LIMITS,
  countValidImages,
  remainingSlots,
} from "../../../shared/utils/imageRules.js";
import { useToast } from "../../../store/ui/ToastContext.jsx";
import { parseApiError } from "../../../services/api/client.js";
import {
  addCarImages,
  removeCarImage,
  reorderCarImages,
} from "../../../services/cars/carsApi.js";
import {
  DeleteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../shared/components/icons.jsx";

export const ManageImagesModal = ({
  car,
  onClose,
  onUpdated,
  limits = IMAGE_LIMITS,
}) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const [newFiles, setNewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (!car) return null;

  const images = Array.isArray(car.images) ? car.images : [];
  const attachedCount = countValidImages(images);
  const slotsLeft = remainingSlots(images.length, limits);

  const handleUpload = async () => {
    if (!newFiles.length || uploading) return;

    if (newFiles.length > slotsLeft) {
      toast.error(
        t("imagesModal.noRoom", {
          current: images.length,
          max: limits.max,
          room: slotsLeft,
        }),
      );
      return;
    }

    setUploading(true);

    try {
      const updated = await addCarImages(car._id, newFiles);
      onUpdated(updated);
      setNewFiles([]);
      toast.success(t("imagesModal.added"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (publicId) => {
    if (busyId || uploading) return;

    if (images.length <= 1) {
      toast.error(t("imagesModal.keepOne"));
      return;
    }

    setBusyId(publicId);

    try {
      const updated = await removeCarImage(car._id, publicId);
      onUpdated(updated);
      toast.success(t("imagesModal.removed"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index, direction) => {
    const target = index + direction;

    if (
      target < 0 ||
      target >= images.length ||
      busyId ||
      uploading
    ) {
      return;
    }

    const reordered = [...images];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];

    const order = reordered.map((image) => image.public_id);

    setBusyId(images[index].public_id);

    try {
      const updated = await reorderCarImages(car._id, order);
      onUpdated(updated);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={!!car}
      onClose={onClose}
      title={t("imagesModal.title", {
        name: car.title || car.model,
      })}
    >
      <div className="max-h-[78vh] space-y-5 overflow-y-auto overscroll-contain pe-1">
        <ImageCountStatus
          className="mb-0"
          count={attachedCount}
          limits={limits}
          needsPublish={!!car.isHidden}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, index) => {
            const isBusy = busyId === img.public_id;

            return (
              <div
                key={img.public_id || img.url || index}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl border bg-graphite-100 transition-all duration-200 ${
                  isBusy
                    ? "border-brass/50 opacity-60"
                    : "border-card hover:border-brass/50"
                }`}
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={`${car.title || car.model || "Vehicle"} ${
                      index + 1
                    }`}
                    loading="lazy"
                    className="block h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-card-muted">
                    {index + 1}
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-graphite-950/70 via-transparent to-graphite-950/15 opacity-80" />

                {index === 0 && (
                  <span className="absolute start-2 top-2 rounded-md bg-brass px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-graphite-950 shadow-sm">
                    {t("imagesModal.cover")}
                  </span>
                )}

                <span className="absolute bottom-2 start-2 rounded-md bg-black/45 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                  {index + 1}
                </span>

                <div className="absolute end-2 top-2 flex items-center gap-1.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleRemove(img.public_id)}
                    disabled={!!busyId || uploading || images.length <= 1}
                    aria-label={t("imagesModal.remove")}
                    title={t("imagesModal.remove")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-graphite-950/75 text-white shadow-sm backdrop-blur transition-colors hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={
                      index === 0 || !!busyId || uploading
                    }
                    aria-label={t("imagesModal.moveEarlier")}
                    title={t("imagesModal.moveEarlier")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-graphite-950/75 text-white shadow-sm backdrop-blur transition-colors hover:bg-graphite-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={
                      index === images.length - 1 ||
                      !!busyId ||
                      uploading
                    }
                    aria-label={t("imagesModal.moveLater")}
                    title={t("imagesModal.moveLater")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-graphite-950/75 text-white shadow-sm backdrop-blur transition-colors hover:bg-graphite-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <section className="rounded-xl border border-card bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-card">
              {t("imagesModal.upload", { count: newFiles.length })}
            </h3>
            <span className="shrink-0 text-xs text-card-muted">
              {Math.max(0, slotsLeft)} {"/"} {limits.max}
            </span>
          </div>

          <ImageUploader
            files={newFiles}
            onChange={setNewFiles}
            limits={limits}
            existingCount={images.length}
          />

          {newFiles.length > 0 && (
            <Button
              className="mt-4 w-full"
              variant="primary"
              loading={uploading}
              disabled={!!busyId || uploading || newFiles.length > slotsLeft}
              onClick={handleUpload}
            >
              {t("imagesModal.upload", { count: newFiles.length })}
            </Button>
          )}
        </section>
      </div>
    </Modal>
  );
};
