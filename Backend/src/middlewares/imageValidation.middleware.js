import { ApiError } from "../utils/apiHelpers.js";

// SECURITY FIX: Multer's MIME type comes from the multipart header,
// not from file content, so arbitrary bytes could be labelled PNG.
// This middleware runs after multer (memory storage) and before the
// controller, and rejects files whose magic bytes do not match their
// declared type. SVG is still rejected by multer's allow-list.
// Add it to car routes: uploadMultiple, handleUploadErrors,
// validateImageBuffers, then the controller.

// JPEG: FF D8 FF | PNG: 89 50 4E 47 0D 0A 1A 0A
// WEBP: RIFF xxxx WEBP | GIF is not allowed, so it is rejected here too.
const signatures = {
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/jpg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) =>
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP",
};

export const validateImageBuffers = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  // Total size guard: 20 files x 5 MB is the existing per-file limit;
  // this makes the total explicit instead of implicit in memory use.
  const totalBytes = files.reduce((sum, f) => sum + (f.size || f.buffer?.length || 0), 0);
  if (totalBytes > 100 * 1024 * 1024) {
    return next(new ApiError(400, "Total upload size exceeds 100 MB"));
  }
  for (const file of files) {
    const check = signatures[file.mimetype];
    if (!check || !file.buffer || !check(file.buffer)) {
      return next(
        new ApiError(400, `Invalid image content for type: ${file.mimetype}`),
      );
    }
  }
  next();
};
