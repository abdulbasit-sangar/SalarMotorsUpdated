// Listing image rules (frontend mirror of the backend's car.constants.js).
//
// The backend is the authority: it enforces these limits on every request and
// publishes them via GET /api/cars/options → `imageLimits`. These defaults are
// only a fallback for before that response arrives (or if it fails), so the
// UI never has to guess differently from the server once it has loaded.
//
// Pure functions, no React — covered by imageRules.test.js.

export const IMAGE_LIMITS = Object.freeze({ min: 5, max: 20 });

// Accepts the `imageLimits` object from /cars/options (or nothing) and always
// returns a sane { min, max }.
export const resolveImageLimits = (fromServer) => {
  const min = Number.isInteger(fromServer?.min) && fromServer.min > 0 ? fromServer.min : IMAGE_LIMITS.min;
  const max = Number.isInteger(fromServer?.max) && fromServer.max >= min ? fromServer.max : IMAGE_LIMITS.max;
  return { min, max };
};

// Only well-formed, attached images count: a non-empty url AND public_id.
// Local File objects, failed uploads, empty entries and malformed objects
// never count as "attached".
export const countValidImages = (images) =>
  Array.isArray(images)
    ? images.filter(
        (img) =>
          img &&
          typeof img.url === "string" &&
          img.url.trim() !== "" &&
          typeof img.public_id === "string" &&
          img.public_id.trim() !== "",
      ).length
    : 0;

// Everything a component needs to render the counter and the publish rule.
export const getPublishStatus = (count, limits = IMAGE_LIMITS) => {
  const { min, max } = resolveImageLimits(limits);
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  const missing = Math.max(0, min - safeCount);
  return {
    count: safeCount,
    min,
    max,
    canPublish: safeCount >= min,
    missing,
    remaining: Math.max(0, max - safeCount),
    counterLabel: `${safeCount} / ${max} images`,
    requirementMessage: `Upload at least ${min} images to publish this listing.`,
    missingMessage:
      missing > 0
        ? `You have ${safeCount} of the ${min} required — add ${missing} more image${missing === 1 ? "" : "s"}.`
        : null,
  };
};

// How many more files can be added given what's already attached.
export const remainingSlots = (attachedCount, limits = IMAGE_LIMITS) =>
  Math.max(0, resolveImageLimits(limits).max - Math.max(0, attachedCount || 0));

// Local files that may be selected for upload: real, non-empty File-likes.
export const countSelectableFiles = (files) =>
  Array.isArray(files) ? files.filter((f) => f && Number(f.size) > 0).length : 0;
