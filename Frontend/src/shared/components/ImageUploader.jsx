import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../store/ui/ToastContext.jsx";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { isolateLtr } from "../utils/format.js";
import { CloseIcon } from "./icons.jsx";
import { IMAGE_LIMITS, remainingSlots } from "../utils/imageRules.js";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — matches upload.middleware.js

/**
 * ImageUploader — mirrors the backend's exact upload constraints
 * (upload.middleware.js: jpeg/png/webp, 5MB/file, max images per listing) so
 * the person sees a rejection before submitting instead of after a round trip.
 *
 * `limits`        { min, max } — from GET /cars/options (falls back to defaults)
 * `existingCount` images already attached to the listing (Manage Images), so
 *                 the cap applies to existing + newly selected, not just the
 *                 new selection.
 */
export const ImageUploader = ({
  files,
  onChange,
  error,
  limits = IMAGE_LIMITS,
  existingCount = 0,
}) => {
  const maxTotal = limits.max;
  const capacity = remainingSlots(existingCount, limits); // how many files may be selected
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [previews, setPreviews] = useState([]);

  // Object URLs are created once per `files` change (not on every render —
  // this component's parent form re-renders on every keystroke elsewhere,
  // so creating URLs inline in JSX would leak a new blob URL each time).
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const addFiles = useCallback(
    (incoming) => {
      const incomingArr = Array.from(incoming);
      const accepted = [];
      let rejectReason = null;

      for (const file of incomingArr) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          rejectReason = t("uploader.badFormat", { name: isolateLtr(file.name) });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          rejectReason = t("uploader.tooBig", { name: isolateLtr(file.name) });
          continue;
        }
        accepted.push(file);
      }

      const combined = [...files, ...accepted];
      if (combined.length > capacity) {
        rejectReason =
          existingCount > 0
            ? t("uploader.maxWithExisting", {
                max: maxTotal,
                existing: existingCount,
                capacity,
              })
            : t("uploader.maxTotal", { max: maxTotal, capacity });
      }

      const finalFiles = combined.slice(0, capacity);
      setLocalError(rejectReason);
      onChange(finalFiles);

      if (accepted.length > 0) {
        toast.success(t("uploader.ready"));
      }
      if (rejectReason) {
        toast.error(rejectReason);
      }
    },
    [files, onChange, capacity, maxTotal, existingCount, t],
  );

  const handleInputChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <p className="field-label">
        {t("uploader.photos")}{" "}
        <span className="text-ash normal-case font-normal">
          {t("uploader.hint", { max: maxTotal })}
        </span>
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-premium-lg px-4 py-10 text-center cursor-pointer transition-colors",
          dragActive
            ? "border-brass bg-brass/8"
            : "border-card bg-white/40 hover:border-brass/50 hover:bg-white/60",
        )}
      >
        <p className="text-bone text-sm font-semibold">
          {t("uploader.drop")}
        </p>
        <p className="text-ash text-xs mt-1">
          {t("uploader.status", {
            selected: files.length,
            remaining: Math.max(0, capacity - files.length),
          })}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {(localError || error) && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {localError || error}
        </p>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-card group min-w-0"
            >
              <img
                src={previews[i]}
                alt={t("uploader.previewAlt", { index: i + 1 })}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label={t("uploader.removeImage", { index: i + 1 })}
                className="absolute top-1.5 end-1.5 w-7 h-7 flex items-center justify-center chip-glass !p-0 !rounded-full !bg-graphite/55 !border-white/15 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-0 inset-x-0 bg-graphite/70 text-brass-light text-[10px] font-mono uppercase tracking-wider text-center py-1">
                  {t("uploader.cover")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
