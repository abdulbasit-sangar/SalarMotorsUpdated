import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AwardIcon,
  CarSilhouetteIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DeleteIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
} from "../../../shared/components/icons.jsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { areaPath } from "../../../shared/utils/areaPath.js";
import {
  IMAGE_LIMITS,
  countValidImages,
  getPublishStatus,
  getPublishMessages,
} from "../../../shared/utils/imageRules.js";
import {
  carLocation,
  carTitle,
  formatPrice,
  getPrimaryImage,
} from "../../../shared/utils/format.js";

const getImageUrl = (image) => {
  if (typeof image === "string") return image;
  return image?.url || image?.secure_url || image?.src || "";
};

const iconButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const actionIconClass = "h-[18px] w-[18px]";

export const AdminCarRow = ({
  car,
  onToggleFeatured,
  onToggleHide,
  onToggleSold,
  onManageImages,
  onDelete,
  pending,
  imageLimits = IMAGE_LIMITS,
}) => {
  const { t } = useTranslation("admin");
  const primaryImage = getPrimaryImage(car);
  const location = carLocation(car);
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === "superadmin";

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const galleryImages = useMemo(() => {
    const validImages = (Array.isArray(car.images) ? car.images : [])
      .map((image) => ({
        url: getImageUrl(image),
        id: image?.public_id || getImageUrl(image),
      }))
      .filter((image) => image.url);

    if (!validImages.length && primaryImage) {
      return [{ url: primaryImage, id: primaryImage }];
    }

    return validImages;
  }, [car.images, primaryImage]);

  const publishStatus = getPublishStatus(
    countValidImages(car.images),
    imageLimits,
  );
  const publishText = getPublishMessages(t, publishStatus);
  const blockedFromPublish = car.isHidden && !publishStatus.canPublish;
  const hintId = `publish-hint-${car._id}`;
  const imageCount = galleryImages.length;

  useEffect(() => {
    if (!galleryOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setGalleryOpen(false);

      if (imageCount > 1 && event.key === "ArrowRight") {
        setActiveImage((current) => (current + 1) % imageCount);
      }

      if (imageCount > 1 && event.key === "ArrowLeft") {
        setActiveImage(
          (current) => (current - 1 + imageCount) % imageCount,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryOpen, imageCount]);

  const openGallery = () => {
    if (!galleryImages.length) {
      // Managers cannot manage pictures — for them an empty gallery
      // simply does nothing instead of opening the image manager.
      if (isSuperAdmin) onManageImages(car);
      return;
    }

    const primaryIndex = galleryImages.findIndex(
      (image) => image.url === primaryImage,
    );

    setActiveImage(Math.max(0, primaryIndex));
    setGalleryOpen(true);
  };

  const changeImage = (direction) => {
    setActiveImage(
      (current) => (current + direction + imageCount) % imageCount,
    );
  };

  const hideTitle = blockedFromPublish
    ? publishText.requirementMessage
    : car.isHidden
      ? t("row.unhide")
      : t("row.hide");

  return (
    <>
      <article className="rounded-2xl border border-card bg-card shadow-sm transition-all duration-200 hover:border-brass/35 hover:shadow-md">
        <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
          {/* Circular vehicle thumbnail */}
          <button
            type="button"
            onClick={openGallery}
            title={t("row.viewPhotos", { title: carTitle(car) })}
            aria-label={t("row.viewPhotos", { title: carTitle(car) })}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-card bg-graphite-100 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:h-16 sm:w-16"
          >
            {primaryImage ? (
              <img
                src={primaryImage}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <CarSilhouetteIcon className="h-6 w-9 text-icon-secondary" />
              </span>
            )}
          </button>

          {/* Listing information */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold leading-snug text-card sm:text-lg">
              {carTitle(car)}
            </h3>

            <p className="mt-0.5 truncate text-xs text-ash sm:text-sm">
              {[location, formatPrice(car.price, car.currency)]
                .filter(Boolean)
                .join(" · ")}
            </p>

            {/* Listing status */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex min-h-6 items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${
                  car.featured
                    ? "border-[#EBD8A8] bg-[#FFF4D9] text-[#805713]"
                    : "border-[#E2E5E9] bg-[#F2F3F5] text-[#626975]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1 w-1 rounded-full ${
                    car.featured ? "bg-[#B8863A]" : "bg-[#9298A2]"
                  }`}
                />
                {car.featured ? t("row.featured") : t("row.notFeatured")}
              </span>

              <span
                className={`inline-flex min-h-6 items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${
                  car.isHidden
                    ? "border-[#F0CACA] bg-[#FCECEC] text-[#A52B2B]"
                    : "border-[#CBE6D1] bg-[#EAF6ED] text-[#24683A]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1 w-1 rounded-full ${
                    car.isHidden ? "bg-[#C33333]" : "bg-[#2F8F4E]"
                  }`}
                />
                {car.isHidden ? t("row.hidden") : t("row.visible")}
              </span>

              <span
                className={`inline-flex min-h-6 items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${
                  car.isSold
                    ? "border-[#F0CACA] bg-[#FCECEC] text-[#A52B2B]"
                    : "border-[#CBE6D1] bg-[#EAF6ED] text-[#24683A]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1 w-1 rounded-full ${
                    car.isSold ? "bg-[#C33333]" : "bg-[#2F8F4E]"
                  }`}
                />
                {car.isSold ? t("row.sold") : t("row.available")}
              </span>
            </div>

            {/* Publishing requirements */}
            {blockedFromPublish && (
              <p
                id={hintId}
                className="mt-2 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-danger"
              >
                {publishText.requirementMessage}{" "}
                {publishText.missingMessage}
              </p>
            )}
          </div>

          {/* Icon-only actions */}
          <div className="flex w-full shrink-0 items-center justify-end gap-1 border-t border-card pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
            <Link
              to={areaPath(admin?.role, `/listings/${car._id}/edit`)}
              title={t("row.editVehicle")}
              aria-label={t("row.editVehicle")}
              className={`${iconButtonClass} hover:bg-brass/10`}
            >
              <EditIcon className={actionIconClass} />
            </Link>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => onToggleFeatured(car)}
                disabled={pending === "feature"}
                title={
                  car.featured ? t("row.unfeature") : t("row.feature")
                }
                aria-label={
                  car.featured ? t("row.unfeature") : t("row.feature")
                }
                className={`${iconButtonClass} hover:bg-brass/10`}
              >
                {pending === "feature" ? (
                  <SpinnerIcon
                    className={`${actionIconClass} animate-spin`}
                  />
                ) : (
                  <AwardIcon className={actionIconClass} />
                )}
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => onToggleHide(car)}
                disabled={pending === "hide" || blockedFromPublish}
                title={hideTitle}
                aria-label={
                  car.isHidden ? t("row.unhide") : t("row.hide")
                }
                aria-describedby={
                  blockedFromPublish ? hintId : undefined
                }
                className={`${iconButtonClass} hover:bg-brass/10`}
              >
                {pending === "hide" ? (
                  <SpinnerIcon
                    className={`${actionIconClass} animate-spin`}
                  />
                ) : car.isHidden ? (
                  <EyeIcon className={actionIconClass} />
                ) : (
                  <EyeOffIcon className={actionIconClass} />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleSold(car)}
              disabled={pending === "sold"}
              title={
                car.isSold ? t("row.markAvailable") : t("row.markSold")
              }
              aria-label={
                car.isSold ? t("row.markAvailable") : t("row.markSold")
              }
              className={`${iconButtonClass} hover:bg-brass/10`}
            >
              {pending === "sold" ? (
                <SpinnerIcon className={`${actionIconClass} animate-spin`} />
              ) : (
                <CheckCircleIcon className={actionIconClass} />
              )}
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => onDelete(car)}
                disabled={pending === "delete"}
                title={t("row.delete")}
                aria-label={t("row.delete")}
                className={`${iconButtonClass} hover:bg-danger/10`}
              >
                {pending === "delete" ? (
                  <SpinnerIcon
                    className={`${actionIconClass} animate-spin`}
                  />
                ) : (
                  <DeleteIcon className={actionIconClass} />
                )}
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Image gallery — full-screen viewer */}
      {galleryOpen && galleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex select-none flex-col bg-[#121419]"
          role="dialog"
          aria-modal="true"
          aria-label={carTitle(car)}
        >
          {/* Top bar: counter centered, close pinned to the top-right corner */}
          <div className="relative flex shrink-0 items-center justify-center px-4 py-3 sm:py-4">
            <p className="text-sm font-medium tabular-nums text-white/70">
              {activeImage + 1} / {imageCount}
            </p>
            <button
              type="button"
              onClick={() => setGalleryOpen(false)}
              aria-label={t("row.closeGallery")}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:right-6"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Full-screen stage */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1 sm:px-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setGalleryOpen(false);
              }
            }}
          >
            <img
              key={galleryImages[activeImage].url}
              src={galleryImages[activeImage].url}
              alt={`${carTitle(car)} — ${activeImage + 1}`}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />

            {imageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => changeImage(-1)}
                  aria-label={t("row.previousImage")}
                  className="absolute start-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:start-6 sm:h-12 sm:w-12"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeImage(1)}
                  aria-label={t("row.nextImage")}
                  className="absolute end-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:end-6 sm:h-12 sm:w-12"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Bottom thumbnail strip */}
          {imageCount > 1 && (
            <div className="shrink-0 overflow-x-auto px-4 py-4 sm:py-5">
              <div className="mx-auto flex w-max max-w-full gap-2 sm:gap-3">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.id}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={t("row.viewImage", { count: index + 1 })}
                    aria-current={
                      activeImage === index ? "true" : undefined
                    }
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:h-20 sm:w-32 ${
                      activeImage === index
                        ? "border-brass opacity-100"
                        : "border-white/15 opacity-50 hover:border-white/40 hover:opacity-90"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
