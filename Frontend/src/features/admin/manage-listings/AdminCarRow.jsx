
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../shared/components/Badge.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
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

const Icon = ({ name, className = "h-4 w-4" }) => {
  const paths = {
    close: (
      <path
        d="m18 6-12 12M6 6l12 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    previous: (
      <path
        d="m15 18-6-6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    next: (
      <path
        d="m9 18 6-6-6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
    >
      {paths[name]}
    </svg>
  );
};

export const AdminCarRow = ({
  car,
  onToggleFeatured,
  onToggleHide,
  onToggleSold,
  onEditFeatures,
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
        setActiveImage((current) => (current - 1 + imageCount) % imageCount);
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
      onManageImages(car);
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

  return (
    <>
      <article className="group overflow-hidden rounded-2xl border border-card bg-card shadow-sm transition-all duration-200 hover:border-brass/35 hover:shadow-lg">
        <div className="flex flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:gap-5">
          <button
            type="button"
            onClick={openGallery}
            aria-label={`View photos of ${carTitle(car)}`}
            className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-graphite-100 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 sm:aspect-[16/8] lg:aspect-[4/3] lg:w-48 xl:w-56"
          >
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={carTitle(car)}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <CarSilhouetteIcon className="h-12 w-16 text-steel" />
              </span>
            )}

            <span className="absolute inset-0 bg-gradient-to-t from-graphite/60 via-transparent to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-100" />

            <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-graphite/65 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md">
                <Icon name="image" className="h-3.5 w-3.5" />
                {imageCount}
              </span>

            </span>
          </button>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="break-words font-display text-lg font-semibold leading-snug text-card sm:text-xl">
                  {carTitle(car)}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-card-muted">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4 w-4 shrink-0"
                  >
                    <path
                      d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <span className="break-words">{location}</span>
                </p>
              </div>

              <p className="shrink-0 font-mono text-lg font-semibold tabular-nums text-brass-dark sm:text-right sm:text-xl">
                {formatPrice(car.price, car.currency)}
              </p>
            </div>

<div className="mt-3 flex flex-wrap items-center gap-1.5">
  {/* Featured status */}
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

  {/* Visibility status */}
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

  {/* Availability status */}
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

            {blockedFromPublish && (
              <p
                id={hintId}
                className="mt-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs leading-relaxed text-danger"
              >
                {publishText.requirementMessage} {publishText.missingMessage}
              </p>
            )}

            {/* Responsive, uniform admin action buttons */}

{/* Responsive, premium SAFAR admin action buttons */}

{/* Responsive admin action buttons — SAFAR color palette */}

{/* Responsive, uniform SAFAR admin action buttons */}
<div className="mt-4 grid grid-cols-2 items-stretch gap-2 border-t border-card pt-3 sm:grid-cols-3 xl:grid-cols-6 [&>div]:min-w-0 [&_button]:!flex [&_button]:!h-10 [&_button]:!w-full [&_button]:!min-w-0 [&_button]:!items-center [&_button]:!justify-center [&_button]:!px-2 [&_button]:!text-center [&_button]:!text-xs [&_button]:!leading-tight">

  {/* Feature */}
  {isSuperAdmin && (
    <div className="min-w-0">
      <Button
        size="sm"
        variant="soft"
        className="!text-[#387448] hover:!text-[#285D37] focus-visible:!ring-2 focus-visible:!ring-[#387448] focus-visible:!ring-offset-2"
        loading={pending === "feature"}
        onClick={() => onToggleFeatured(car)}
      >
        {car.featured ? t("row.unfeature") : t("row.feature")}
      </Button>
    </div>
  )}

  {/* Hide / Unhide */}
  <div className="min-w-0">
    <Button
      size="sm"
      variant="soft"
      className="!text-[#28618A] hover:!text-[#1D4968] focus-visible:!ring-2 focus-visible:!ring-[#28618A] focus-visible:!ring-offset-2"
      loading={pending === "hide"}
      disabled={blockedFromPublish}
      aria-describedby={blockedFromPublish ? hintId : undefined}
      title={
        blockedFromPublish
          ? publishText.requirementMessage
          : undefined
      }
      onClick={() => onToggleHide(car)}
    >
      {car.isHidden ? t("row.unhide") : t("row.hide")}
    </Button>
  </div>

  {/* Mark Sold / Available */}
  <div className="min-w-0">
    <Button
      size="sm"
      variant="soft"
      className="!text-[#956719] hover:!text-[#765012] focus-visible:!ring-2 focus-visible:!ring-[#956719] focus-visible:!ring-offset-2"
      loading={pending === "sold"}
      onClick={() => onToggleSold(car)}
    >
      {car.isSold ? t("row.markAvailable") : t("row.markSold")}
    </Button>
  </div>

  {/* Edit Features */}
  <div className="min-w-0">
    <Button
      size="sm"
      variant="soft"
      className="!text-[#60469A] hover:!text-[#493374] focus-visible:!ring-2 focus-visible:!ring-[#60469A] focus-visible:!ring-offset-2"
      onClick={() => onEditFeatures(car)}
    >
      {car.features?.length
        ? t("row.editFeaturesCount", { count: car.features.length })
        : t("row.editFeatures")}
    </Button>
  </div>

  {/* Manage Images */}
  <div className="min-w-0">
    <Button
      size="sm"
      variant="soft"
      className="!text-[#247A78] hover:!text-[#195F5D] focus-visible:!ring-2 focus-visible:!ring-[#247A78] focus-visible:!ring-offset-2"
      onClick={() => onManageImages(car)}
    >
      {t("row.manageImages", { count: car.images?.length || 0 })}
    </Button>
  </div>

  {/* Delete */}
  <div className="min-w-0">
    <Button
      size="sm"
      variant="soft"
      className="!text-[#C33333] hover:!text-[#982727] focus-visible:!ring-2 focus-visible:!ring-[#C33333] focus-visible:!ring-offset-2"
      loading={pending === "delete"}
      onClick={() => onDelete(car)}
    >
      {t("row.delete")}
    </Button>
  </div>
</div>



          </div>
        </div>
      </article>

      {galleryOpen && galleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-graphite-950/95 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={carTitle(car)}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setGalleryOpen(false);
            }
          }}
        >
          <div className="flex max-h-full w-full max-w-6xl flex-col gap-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-white sm:text-lg">
                  {carTitle(car)}
                </h2>
                <p className="mt-0.5 text-xs text-white/60">
                  {activeImage + 1} / {imageCount}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                aria-label="Close gallery"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/25">
              <img
                key={galleryImages[activeImage].url}
                src={galleryImages[activeImage].url}
                alt={`${carTitle(car)} — ${activeImage + 1}`}
                className="max-h-[68vh] w-full object-contain sm:max-h-[72vh]"
              />

              {imageCount > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => changeImage(-1)}
                    aria-label="Previous image"
                    className="absolute start-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:start-4 sm:h-12 sm:w-12"
                  >
                    <Icon name="previous" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeImage(1)}
                    aria-label="Next image"
                    className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:end-4 sm:h-12 sm:w-12"
                  >
                    <Icon name="next" className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {imageCount > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.id}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-current={activeImage === index ? "true" : undefined}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:h-16 sm:w-24 ${
                      activeImage === index
                        ? "border-brass opacity-100"
                        : "border-white/15 opacity-60 hover:border-white/50 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
