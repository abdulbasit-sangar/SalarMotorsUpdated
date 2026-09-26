import { useState } from "react";
import { Modal } from "../../../shared/components/Modal.jsx";
import { ImageUploader } from "../../../shared/components/ImageUploader.jsx";
import { Button } from "../../../shared/components/Button.jsx";
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

/**
 * ManageImagesModal — Admin/Manager Image Editing (spec requirement #6).
 * Existing images are shown as a reorderable grid (left/right nudge rather
 * than full drag-and-drop, which keeps this dependency-free while still
 * satisfying "reorder if it can be added cleanly"); new images upload via
 * the same ImageUploader used on Create Listing. Every action hits the
 * backend immediately (no local-only staging) so the car's image list is
 * never out of sync with what's actually stored in ImageKit.
 */
export const ManageImagesModal = ({ car, onClose, onUpdated }) => {
  const toast = useToast();
  const [newFiles, setNewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null); // public_id currently being removed/reordered

  if (!car) return null;

  const images = car.images || [];

  const handleUpload = async () => {
    if (!newFiles.length) return;
    setUploading(true);
    try {
      const updated = await addCarImages(car._id, newFiles);
      onUpdated(updated);
      setNewFiles([]);
      toast.success("Images added successfully.");
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (publicId) => {
    if (images.length <= 1) {
      toast.error("A listing must keep at least one image.");
      return;
    }
    setBusyId(publicId);
    try {
      const updated = await removeCarImage(car._id, publicId);
      onUpdated(updated);
      toast.success("Image removed.");
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const order = reordered.map((img) => img.public_id);

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
    <Modal open={!!car} onClose={onClose} title={`Manage Images — ${car.title || car.model}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, index) => (
          <div key={img.public_id} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-graphite-100 group">
            <img src={img.url} alt="" className="w-full h-full object-cover" />

            <div className="absolute inset-0 bg-graphite/0 group-hover:bg-graphite/40 transition-colors" />

            <button
              type="button"
              onClick={() => handleRemove(img.public_id)}
              disabled={busyId === img.public_id}
              aria-label="Remove image"
              className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
            >
              <DeleteIcon className="h-3.5 w-3.5" />
            </button>

            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0 || busyId === img.public_id}
                aria-label="Move left"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-card disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={index === images.length - 1 || busyId === img.public_id}
                aria-label="Move right"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-card disabled:opacity-40"
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {index === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-full bg-brass px-2 py-0.5 text-[10px] font-mono font-semibold text-graphite-950">
                Cover
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-card">
        <ImageUploader files={newFiles} onChange={setNewFiles} />
        {newFiles.length > 0 && (
          <Button className="mt-4 w-full" variant="primary" loading={uploading} onClick={handleUpload}>
            Upload {newFiles.length} Image{newFiles.length > 1 ? "s" : ""}
          </Button>
        )}
      </div>
    </Modal>
  );
};
