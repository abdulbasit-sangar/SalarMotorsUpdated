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
    // Dimension guard: magic bytes prove the header, not the image. A 5 MB
    // file can declare 20000x20000 px (a decompression bomb for clients) or
    // carry a polyglot payload. Dimensions are read straight from the format
    // headers — no image library, no new dependencies.
    const dims = readDimensions(file.mimetype, file.buffer);
    if (
      dims &&
      (dims.width > MAX_IMAGE_DIMENSION_PX || dims.height > MAX_IMAGE_DIMENSION_PX)
    ) {
      return next(
        new ApiError(
          400,
          `Image dimensions exceed the ${MAX_IMAGE_DIMENSION_PX}px limit.`,
        ),
      );
    }
  }
  next();
};

// ─── Dimension validation (dependency-free) ─────────────────────────────────
// Caps are generous (12,000 px ≈ 144 MP): real listing photos are far smaller,
// so false rejections are not a practical risk. If dimensions cannot be parsed
// (corrupt/truncated header), the file passes through as before — ImageKit
// rejects what it cannot decode.
const MAX_IMAGE_DIMENSION_PX = 12000;

const readPngDimensions = (b) => {
  // 8-byte signature, then IHDR chunk: length(4) + "IHDR"(4) + width(4) + height(4)
  if (b.length < 33) return null;
  if (b.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

const readJpegDimensions = (b) => {
  // Scan segment markers for a Start-Of-Frame marker (baseline, extended,
  // progressive). Standalone markers (RSTn, SOI, EOI, TEM) carry no length.
  let i = 2; // skip SOI
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      i += 2;
      continue;
    }
    if (marker === 0xff || marker === 0x00) {
      i += 1; // fill byte / stuffed byte
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
};

const readWebpDimensions = (b) => {
  // RIFF(0-3) size(4-7) "WEBP"(8-11) chunk-id(12-15) chunk-size(16-19) ...
  if (b.length < 30) return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    // lossy: frame tag(3) + start code(3) + 14-bit width/height
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    // lossless: 4 bytes pack 14-bit width-1 and height-1
    if (b.length < 25) return null;
    const b0 = b[21];
    const b1 = b[22];
    const b2 = b[23];
    const b3 = b[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X") {
    // extended: 24-bit width-1 at 24-26, height-1 at 27-29
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  return null;
};

const readDimensions = (mimetype, buffer) => {
  try {
    if (mimetype === "image/png") return readPngDimensions(buffer);
    if (mimetype === "image/jpeg" || mimetype === "image/jpg")
      return readJpegDimensions(buffer);
    if (mimetype === "image/webp") return readWebpDimensions(buffer);
  } catch {
    return null;
  }
  return null;
};
