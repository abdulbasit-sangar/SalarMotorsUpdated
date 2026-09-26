// ─────────────────────────────────────────────────────────────────────────────
// Upload middleware using ImageKit and in-memory buffers.
//
// WHAT CHANGED vs the old Cloudinary version:
//   OLD: multer.diskStorage → save to disk → upload to Cloudinary → delete from disk
//   NEW: multer.memoryStorage → file lives in RAM as buffer → upload to ImageKit → done
//
// Why memoryStorage:
//   - No disk I/O, no temp files to clean up
//   - Works on serverless / platforms with read-only filesystems (Render, Railway)
//   - Faster — one less file system round-trip
//
// ImageKit response fields used:
//   result.url        → full image URL  (stored in DB as `url`)
//   result.fileId     → ImageKit file ID (stored in DB as `public_id`, used for deletion)
// ─────────────────────────────────────────────────────────────────────────────

import multer from "multer";
import imagekit from "../config/imagekit.js";
import { ApiError } from "../utils/apiHelpers.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 10;
const IMAGEKIT_OPERATION_TIMEOUT_MS = 30_000;

const withTimeout = (promise, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(message)),
        IMAGEKIT_OPERATION_TIMEOUT_MS,
      ),
    ),
  ]);

// ─── Memory storage ───────────────────────────────────────────────────────────
// Files go into req.files[i].buffer — no disk writes at all.
const storage = multer.memoryStorage();

// ─── File type filter ─────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG and WEBP are allowed.`,
      ),
      false,
    );
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 5 MB per file
    files: MAX_FILES, // max 10 files per request
  },
});

// ─── Core upload function ─────────────────────────────────────────────────────
/**
 * uploadToImageKit(file)
 *
 * Uploads a single multer file (from memoryStorage) to ImageKit.
 * Returns an object shaped to match the existing Car schema:
 *   { url: string, public_id: string }
 *
 * @param {Express.Multer.File} file - multer file object (must have .buffer)
 * @returns {Promise<{ url: string, public_id: string }>}
 */
export const uploadToImageKit = async (file) => {
  // Build a clean filename: strip spaces and special chars
  const safeName = `car_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const ext = file.mimetype.split("/")[1]; // jpeg | png | webp
  const fileName = `${safeName}.${ext}`;

  const uploadPromise = imagekit.upload({
    file: file.buffer, // Buffer from memoryStorage
    fileName,
    folder: "/cars", // Organises uploads under /cars in ImageKit dashboard
    useUniqueFileName: false, // We already generate a unique name above
    tags: ["car", "marketplace"],
  });

  // Promise.race does not cancel the underlying HTTP call — if the timeout
  // wins the race, the real ImageKit upload keeps running in the background
  // and can still land afterwards. Left unhandled, that produces exactly
  // the reported symptom ("images sometimes end up in ImageKit even though
  // the request reported failure"): a file appears in the dashboard that
  // nothing in Mongo ever references, because it was never part of
  // `uploaded` and so never went through the normal rollback path. `timedOut`
  // distinguishes this from the ordinary fast path, so a late-arriving
  // success is deleted automatically ONLY when we already gave up on it —
  // a normal successful upload must never be touched here.
  let timedOut = false;
  let result;
  try {
    result = await Promise.race([
      uploadPromise,
      new Promise((_, reject) =>
        setTimeout(() => {
          timedOut = true;
          reject(new Error("ImageKit upload timed out"));
        }, IMAGEKIT_OPERATION_TIMEOUT_MS),
      ),
    ]);
  } catch (error) {
    if (timedOut) {
      uploadPromise
        .then((lateResult) => {
          if (lateResult?.fileId) {
            imagekit
              .deleteFile(lateResult.fileId)
              .catch((cleanupErr) =>
                console.error(
                  `[uploadToImageKit] failed to clean up late-arriving upload ${lateResult.fileId} after timeout:`,
                  cleanupErr.message,
                ),
              );
          }
        })
        .catch(() => {
          /* Original upload failing too is not a new problem to handle here. */
        });
    }
    throw error;
  }

  if (!result?.url || !result?.fileId) {
    throw new ApiError(502, "ImageKit returned an incomplete upload result");
  }

  return {
    url: result.url, // full HTTPS URL
    public_id: result.fileId, // ImageKit file ID — used for deletion
  };
};

/**
 * uploadManyToImageKit(files)
 *
 * Uploads all files in parallel. Called from the car controller after
 * multer has populated req.files.
 *
 * @param {Express.Multer.File[]} files
 * @returns {Promise<Array<{ url: string, public_id: string }>>}
 */
export const uploadManyToImageKit = async (files = []) => {
  const results = await Promise.allSettled(
    files.map((file) => uploadToImageKit(file)),
  );
  const uploaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failed = results.find((result) => result.status === "rejected");

  if (failed) {
    const cleanup = await deleteManyFromImageKit(uploaded);
    failed.reason.cleanup = cleanup;
    throw failed.reason;
  }

  return uploaded;
};

/**
 * deleteFromImageKit(fileId)
 *
 * Deletes a single file from ImageKit by its fileId (stored as public_id).
 * Called when a car is deleted or an image is removed during edit.
 * User-initiated cleanup can set throwOnError so the database is not changed
 * when ImageKit did not confirm deletion.
 *
 * @param {string} fileId - the ImageKit fileId (stored in DB as public_id)
 */
export const deleteFromImageKit = async (
  fileId,
  { throwOnError = false } = {},
) => {
  try {
    await withTimeout(
      imagekit.deleteFile(fileId),
      `ImageKit delete timed out for fileId: ${fileId}`,
    );
    return { public_id: fileId, ok: true, missing: false };
  } catch (err) {
    const message = String(err?.message || "");
    const status = err?.statusCode || err?.status || err?.response?.status;
    if (status === 404 || /not found|does not exist/i.test(message)) {
      return { public_id: fileId, ok: true, missing: true };
    }
    console.warn(`ImageKit delete failed for fileId: ${fileId}`, err.message);
    if (throwOnError) throw err;
    return { public_id: fileId, ok: false, missing: false, error: message };
  }
};

/**
 * deleteManyFromImageKit(images)
 *
 * Deletes a list of images from ImageKit.
 * Uses allSettled so all files get an attempted deletion. With throwOnError,
 * the caller receives a failure after every deletion attempt completes.
 *
 * @param {Array<{ url: string, public_id: string }>} images
 */
export const deleteManyFromImageKit = async (
  images = [],
  { throwOnError = false } = {},
) => {
  const results = await Promise.all(
    images.map(({ public_id }) =>
      deleteFromImageKit(public_id, { throwOnError }),
    ),
  );
  return {
    deleted: results.filter((result) => result.ok),
    failed: results.filter((result) => !result.ok),
  };
};

// ─── Multer middleware exports ─────────────────────────────────────────────────
export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", MAX_FILES);

// ─── Multer error handler ──────────────────────────────────────────────────────
/**
 * handleUploadErrors
 *
 * Must be registered AFTER the multer middleware in the route chain:
 *   router.post("/", verifyJWT, uploadMultiple, handleUploadErrors, controller)
 *
 * Converts multer-specific errors (file size, file count, unexpected field)
 * into clean ApiError JSON responses.
 */
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new ApiError(
          400,
          `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB per image.`,
        ),
      );
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(
        new ApiError(
          400,
          `Too many files. Maximum is ${MAX_FILES} images per car.`,
        ),
      );
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(
        new ApiError(
          400,
          `Unexpected field: ${err.field}. Use "images" as the field name.`,
        ),
      );
    }
    return next(new ApiError(400, err.message));
  }
  next(err);
};
