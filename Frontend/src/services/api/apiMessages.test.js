import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiMessageKey, KNOWN_EXACT_MESSAGES } from "./apiMessageMap.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendSrc = path.join(here, "..", "..", "..", "..", "Backend", "src");
const errorsEn = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "locales", "en", "errors.json"), "utf8")).server;

test("every mapped message points at a real errors.server key (incl. plural forms)", () => {
  const keys = new Set(Object.keys(errorsEn));
  const has = (k) => keys.has(k) || keys.has(`${k}_one`) || keys.has(`${k}_other`);
  for (const msg of KNOWN_EXACT_MESSAGES) assert.ok(has(getApiMessageKey(msg)), msg);
});

test("dynamic backend messages are recognised", () => {
  const cases = {
    "Upload at least 5 images to publish this listing.": "imageMin",
    "A car can have a maximum of 20 images": "imageMax",
    "Provide between 1 and 20 images": "imageRange",
    "This listing has 3 valid images; 2 more are required (minimum 5).": "imageMinDetail",
    "This listing already has 18 images and you tried to add 3; only 2 more can be added.": "imageMaxDetail",
    "Too many files. Maximum is 20 images per car.": "tooManyFiles",
    "File too large. Maximum size is 5MB per image.": "fileTooLarge",
    "Invalid car ID: abc": "invalidId",
    "Route not found: /api/x": "routeNotFound",
    "vin 'ABC' already exists": "duplicateField",
  };
  for (const [msg, key] of Object.entries(cases)) assert.equal(getApiMessageKey(msg), key, msg);
  assert.equal(getApiMessageKey("Some message the backend adds tomorrow"), null);
});

test("every ApiError message in the backend is mapped to a translation", () => {
  if (!fs.existsSync(backendSrc)) return; // frontend-only checkout
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".js")) files.push(p);
    }
  };
  walk(backendSrc);

  const unmapped = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/new ApiError\(\s*\d+\s*,\s*(["`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      // Replace template expressions with a numeric stand-in so dynamic messages can still match a pattern.
      const msg = m[2].replace(/\$\{[^}]*\}/g, "5");
      if (!getApiMessageKey(msg)) unmapped.add(`${path.basename(file)}: ${msg}`);
    }
  }
  assert.deepEqual([...unmapped], [], "map these backend messages in apiMessageMap.js");
});
