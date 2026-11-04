// Image limits (max 20) and publication rule (min 5) — backend enforcement.
// No database needed: Mongoose model calls and ImageKit are mocked, and the
// real multer + Express stack is exercised over HTTP for the upload limits.
import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";

// The ImageKit SDK validates its config at import time; dummy values keep it
// from throwing and nothing here ever reaches the network (upload/delete are
// mocked per test).
process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const { default: Car } = await import("../src/models/car.model.js");
const { default: imagekit } = await import("../src/config/imagekit.js");
const constants = await import("../src/constants/car.constants.js");
const service = await import("../src/services/car.service.js");
const validators = await import("../src/validators/car.validator.js");
const upload = await import("../src/middlewares/upload.middleware.js");
const auth = await import("../src/middlewares/auth.middleware.js");
const { default: router } = await import("../src/routes/car.routes.js");
const { default: errorHandler } = await import(
  "../src/middlewares/error.middleware.js"
);
const { ApiError } = await import("../src/utils/apiHelpers.js");

const { MAX_CAR_IMAGES, MIN_IMAGES_TO_PUBLISH, countValidImages } = constants;

afterEach(() => mock.restoreAll());

// ── helpers ──────────────────────────────────────────────────────────────────
const images = (n) =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://ik.imagekit.io/test/cars/${i}.jpg`,
    public_id: `file_${i}`,
  }));

// Minimal thenable stand-in for a Mongoose Query.
const query = (result) => {
  const q = {
    select: () => q,
    lean: () => Promise.resolve(result),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };
  return q;
};

const carDoc = (overrides = {}) => {
  const doc = { _id: "665f1c2e8f1b2c0012345678", title: "T", isHidden: true, images: images(0), ...overrides };
  doc.toObject = () => ({ ...doc });
  return doc;
};

const fakeFiles = (n, size = 10) =>
  Array.from({ length: n }, (_, i) => ({
    originalname: `p${i}.jpg`,
    mimetype: "image/jpeg",
    size,
    buffer: Buffer.alloc(size, 1),
  }));

const runMiddleware = (mw, req) =>
  new Promise((resolve) => mw(req, {}, (err) => resolve(err)));

const rejection = async (promise) => {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  assert.fail("expected the promise to reject");
};

// ── shared constants ─────────────────────────────────────────────────────────
test("limits are min 5 / max 20 and exposed to the frontend via options", () => {
  assert.equal(MIN_IMAGES_TO_PUBLISH, 5);
  assert.equal(MAX_CAR_IMAGES, 20);
  assert.deepEqual(service.getCarOptionsService().imageLimits, { min: 5, max: 20 });
});

test("countValidImages ignores empty, malformed and non-array values", () => {
  const messy = [
    ...images(3),
    null,
    undefined,
    {},
    { url: "", public_id: "x" },
    { url: "https://x/y.jpg", public_id: "  " },
    { url: 42, public_id: "x" },
  ];
  assert.equal(countValidImages(messy), 3);
  assert.equal(countValidImages(undefined), 0);
  assert.equal(countValidImages("nope"), 0);
});

// ── schema ───────────────────────────────────────────────────────────────────
test("schema accepts 20 images and rejects a 21st", () => {
  const errorsFor = (n) => new Car({ images: images(n) }).validateSync()?.errors?.images;
  assert.equal(errorsFor(20), undefined);
  assert.match(errorsFor(21).message, /maximum of 20 images/);
});

// ── creation = publication boundary (runs before any upload) ─────────────────
test("create rejects 0 and 1–4 files with a clear 400, before any upload", async () => {
  const upSpy = mock.method(imagekit, "upload", async () => assert.fail("no upload expected"));
  for (const n of [0, 1, 2, 3, 4]) {
    const err = await runMiddleware(validators.validateMinImagesToPublish, { files: fakeFiles(n) });
    assert.ok(err instanceof ApiError, `n=${n}`);
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, "Upload at least 5 images to publish this listing.");
    assert.match(err.errors[0], new RegExp(`has ${n} valid image`));
  }
  assert.equal(upSpy.mock.callCount(), 0);
});

test("create rejects when req.files is missing entirely", async () => {
  const err = await runMiddleware(validators.validateMinImagesToPublish, {});
  assert.equal(err.statusCode, 400);
});

test("create accepts exactly 5 and exactly 20 files", async () => {
  for (const n of [5, 20]) {
    const req = { files: fakeFiles(n) };
    assert.equal(await runMiddleware(validators.validateMinImagesToPublish, req), undefined);
    assert.equal(req.files.length, n);
  }
});

test("zero-byte / empty files do not count toward the minimum", async () => {
  const req = { files: [...fakeFiles(4), ...fakeFiles(3, 0).map((f) => ({ ...f, buffer: Buffer.alloc(0) }))] };
  const err = await runMiddleware(validators.validateMinImagesToPublish, req);
  assert.equal(err.statusCode, 400);
  assert.match(err.errors[0], /has 4 valid images/);
});

// ── createCarService: only images that actually uploaded count ───────────────
test("createCarService attaches 5 and 20 uploaded images", async () => {
  for (const n of [5, 20]) {
    mock.method(imagekit, "upload", async () => ({ url: "https://ik.imagekit.io/t/a.jpg", fileId: `id_${Math.random()}` }));
    const create = mock.method(Car, "create", async (doc) => ({ ...doc, _id: "c1" }));
    const car = await service.createCarService({ title: "T" }, fakeFiles(n), "admin1");
    assert.equal(car.images.length, n);
    assert.equal(create.mock.callCount(), 1);
    mock.restoreAll();
  }
});

test("createCarService: a failed upload aborts, rolls back, and creates nothing", async () => {
  let calls = 0;
  mock.method(imagekit, "upload", async () => {
    calls += 1;
    if (calls === 3) throw new Error("ImageKit exploded");
    return { url: "https://ik.imagekit.io/t/a.jpg", fileId: `id_${calls}` };
  });
  const deleted = [];
  mock.method(imagekit, "deleteFile", async (id) => deleted.push(id));
  const create = mock.method(Car, "create", async () => assert.fail("must not create"));

  const err = await rejection(service.createCarService({ title: "T" }, fakeFiles(6), "admin1"));
  assert.match(err.message, /exploded/);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(calls, 5); // second batch (the 6th file) never started
  assert.equal(deleted.length, 4); // the 4 that did land were rolled back
});

test("createCarService re-checks the uploaded count and rolls back if short", async () => {
  mock.method(imagekit, "upload", async () => ({ url: "https://ik.imagekit.io/t/a.jpg", fileId: `id_${Math.random()}` }));
  const deleted = [];
  mock.method(imagekit, "deleteFile", async (id) => deleted.push(id));
  const create = mock.method(Car, "create", async () => assert.fail("must not create"));

  const err = await rejection(service.createCarService({ title: "T" }, fakeFiles(4), "admin1"));
  assert.equal(err.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(deleted.length, 4);
});

// ── unhide (hidden → visible) = publication boundary for existing listings ──
test("unhide is rejected for 0 and 1–4 valid images and writes nothing", async () => {
  for (const n of [0, 1, 4]) {
    mock.method(Car, "findById", () => query(carDoc({ isHidden: true, images: images(n) })));
    const write = mock.method(Car, "findOneAndUpdate", () => query(null));
    const err = await rejection(service.toggleHideCarService("665f1c2e8f1b2c0012345678"));
    assert.equal(err.statusCode, 400, `n=${n}`);
    assert.equal(err.message, "Upload at least 5 images to publish this listing.");
    assert.equal(write.mock.callCount(), 0, `n=${n}: no partial update`);
    mock.restoreAll();
  }
});

test("unhide succeeds with exactly 5 and with 20 images, and the write is count-guarded", async () => {
  for (const n of [5, 20]) {
    mock.method(Car, "findById", () => query(carDoc({ isHidden: true, images: images(n) })));
    const write = mock.method(Car, "findOneAndUpdate", () => query({ title: "T", images: images(n) }));
    const out = await service.toggleHideCarService("665f1c2e8f1b2c0012345678");
    assert.equal(out.isHidden, false);
    const [filter, update] = write.mock.calls[0].arguments;
    assert.equal(filter.isHidden, true);
    assert.deepEqual(filter["images.4"], { $exists: true }); // atomic re-check
    assert.deepEqual(update, { $set: { isHidden: false } });
    mock.restoreAll();
  }
});

test("malformed image entries do not make an unhide eligible", async () => {
  const sneaky = [...images(3), { url: "", public_id: "a" }, null];
  mock.method(Car, "findById", () => query(carDoc({ isHidden: true, images: sneaky })));
  mock.method(Car, "findOneAndUpdate", () => assert.fail("must not write"));
  const err = await rejection(service.toggleHideCarService("665f1c2e8f1b2c0012345678"));
  assert.equal(err.statusCode, 400);
});

test("unhide race: images removed after the read → guarded write misses, still rejected", async () => {
  const states = [
    carDoc({ isHidden: true, images: images(5) }), // first read looks fine
    carDoc({ isHidden: true, images: images(3) }), // by the fallback read it is short
  ];
  mock.method(Car, "findById", () => query(states.shift()));
  mock.method(Car, "findOneAndUpdate", () => query(null));
  const err = await rejection(service.toggleHideCarService("665f1c2e8f1b2c0012345678"));
  assert.equal(err.statusCode, 400);
  assert.match(err.errors[0], /has 3 valid images/);
});

test("hiding a visible listing is never gated, even with fewer than 5 images", async () => {
  mock.method(Car, "findById", () => query(carDoc({ isHidden: false, images: images(2) })));
  const upd = mock.method(Car, "findByIdAndUpdate", () => query({ title: "T", isHidden: true }));
  const out = await service.toggleHideCarService("665f1c2e8f1b2c0012345678");
  assert.equal(out.isHidden, true);
  assert.equal(upd.mock.callCount(), 1);
});

// ── adding images: existing + new <= 20 ──────────────────────────────────────
test("add counts images already attached: 18 + 2 ok, 18 + 3 rejected", async () => {
  mock.method(Car, "findById", () => query(carDoc({ images: images(18) })));
  const write = mock.method(Car, "findOneAndUpdate", () => query({ title: "T", images: images(20) }));
  await service.addCarImagesService("665f1c2e8f1b2c0012345678", images(2));
  const [filter] = write.mock.calls[0].arguments;
  assert.deepEqual(filter.$expr.$lte[1], 18); // atomic cap: size <= 20 - 2

  const err = await rejection(service.addCarImagesService("665f1c2e8f1b2c0012345678", images(3)));
  assert.equal(err.statusCode, 400);
  assert.match(err.message, /maximum of 20 images/);
  assert.match(err.errors[0], /already has 18 images.*only 2 more/);
  assert.equal(write.mock.callCount(), 1); // the rejected call wrote nothing
});

test("a 21st image is rejected (20 existing + 1)", async () => {
  mock.method(Car, "findById", () => query(carDoc({ images: images(20) })));
  mock.method(Car, "findOneAndUpdate", () => assert.fail("must not write"));
  const err = await rejection(service.addCarImagesService("665f1c2e8f1b2c0012345678", images(1)));
  assert.equal(err.statusCode, 400);
});

test("add race: another request fills the listing between read and write", async () => {
  const reads = [carDoc({ images: images(10) }), carDoc({ images: images(20) })];
  mock.method(Car, "findById", () => query(reads.shift()));
  mock.method(Car, "findOneAndUpdate", () => query(null)); // guarded write matched nothing
  const err = await rejection(service.addCarImagesService("665f1c2e8f1b2c0012345678", images(5)));
  assert.equal(err.statusCode, 400);
  assert.match(err.errors[0], /already has 20 images.*only 0 more/);
});

test("pre-flight check fails fast, before any ImageKit upload", async () => {
  mock.method(Car, "findById", () => query(carDoc({ images: images(19) })));
  const err = await rejection(service.assertCanAddImagesService("665f1c2e8f1b2c0012345678", 2));
  assert.equal(err.statusCode, 400);
  await service.assertCanAddImagesService("665f1c2e8f1b2c0012345678", 1); // 19 + 1 = 20 is fine
});

// ── replace / reorder / remove keep working ──────────────────────────────────
test("replace accepts 1–20 images and rejects 0 and 21", async () => {
  for (const n of [1, 20]) {
    mock.method(Car, "findById", () => query(carDoc({ images: [] })));
    mock.method(Car, "findByIdAndUpdate", () => query({ title: "T", images: images(n) }));
    const out = await service.replaceCarImagesService("665f1c2e8f1b2c0012345678", images(n));
    assert.equal(out.images.length, n);
    mock.restoreAll();
  }
  mock.method(Car, "findById", () => query(carDoc({ images: [] })));
  for (const n of [0, 21]) {
    const err = await rejection(service.replaceCarImagesService("665f1c2e8f1b2c0012345678", images(n)));
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /between 1 and 20/);
  }
});

test("replace deletes the old ImageKit files (cleanup behaviour preserved)", async () => {
  const old = images(7);
  mock.method(Car, "findById", () => query(carDoc({ images: old })));
  mock.method(Car, "findByIdAndUpdate", () => query({ title: "T", images: images(5) }));
  const deleted = [];
  mock.method(imagekit, "deleteFile", async (id) => deleted.push(id));
  await service.replaceCarImagesService("665f1c2e8f1b2c0012345678", images(5));
  assert.deepEqual(deleted.sort(), old.map((i) => i.public_id).sort());
});

test("reorder keeps working with 20 images and preserves identifiers", async () => {
  const imgs = images(20);
  mock.method(Car, "findById", () => query(carDoc({ images: imgs })));
  const upd = mock.method(Car, "findByIdAndUpdate", (_id, u) => query({ title: "T", images: u.$set.images }));
  const order = imgs.map((i) => i.public_id).reverse();
  const out = await service.reorderCarImagesService("665f1c2e8f1b2c0012345678", order);
  assert.deepEqual(out.images.map((i) => i.public_id), order);
  assert.equal(upd.mock.callCount(), 1);
  const err = await rejection(service.reorderCarImagesService("665f1c2e8f1b2c0012345678", order.slice(1)));
  assert.equal(err.statusCode, 400);
});

test("removing an image still deletes from ImageKit and pulls it from the listing", async () => {
  const imgs = images(6);
  mock.method(Car, "findById", () => query(carDoc({ isHidden: false, images: imgs })));
  const deleted = [];
  mock.method(imagekit, "deleteFile", async (id) => deleted.push(id));
  const pull = mock.method(Car, "findByIdAndUpdate", () => query({ title: "T", images: imgs.slice(1) }));
  const out = await service.removeCarImageService("665f1c2e8f1b2c0012345678", "file_0");
  assert.deepEqual(deleted, ["file_0"]);
  assert.equal(out.images.length, 5);
  assert.deepEqual(pull.mock.calls[0].arguments[1], { $pull: { images: { public_id: "file_0" } } });
});

// ── upload concurrency ───────────────────────────────────────────────────────
test("uploads run in bounded batches and still return all 20 results in order", async () => {
  let active = 0;
  let peak = 0;
  mock.method(imagekit, "upload", async ({ fileName }) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
    return { url: `https://ik.imagekit.io/t/${fileName}`, fileId: fileName };
  });
  const out = await upload.uploadManyToImageKit(fakeFiles(20));
  assert.equal(out.length, 20);
  assert.ok(peak <= 5, `peak concurrency was ${peak}`);
});

test("a failed batch stops further uploads and rolls back what landed", async () => {
  let started = 0;
  mock.method(imagekit, "upload", async () => {
    started += 1;
    if (started === 7) throw new Error("boom");
    return { url: "https://ik.imagekit.io/t/x.jpg", fileId: `id_${started}` };
  });
  const deleted = [];
  mock.method(imagekit, "deleteFile", async (id) => deleted.push(id));
  const err = await rejection(upload.uploadManyToImageKit(fakeFiles(20)));
  assert.match(err.message, /boom/);
  assert.equal(started, 10); // batches 1–2 only; batch 3 never started
  assert.equal(deleted.length, 9); // every success from the two batches rolled back
});

// ── real multer limits over HTTP ─────────────────────────────────────────────
const withUploadServer = async (fn) => {
  const app = express();
  app.post("/up", upload.uploadMultiple, upload.handleUploadErrors, (req, res) =>
    res.json({ count: req.files.length }),
  );
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}/up`);
  } finally {
    await new Promise((r) => server.close(r));
  }
};

const post = (url, n, type = "image/png") => {
  const fd = new FormData();
  for (let i = 0; i < n; i++) fd.append("images", new Blob([Buffer.alloc(20, 1)], { type }), `p${i}.png`);
  return fetch(url, { method: "POST", body: fd });
};

test("multer accepts 20 files and rejects 21 with a clear 400", async () => {
  await withUploadServer(async (url) => {
    const ok = await post(url, 20);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).count, 20);

    const tooMany = await post(url, 21);
    assert.equal(tooMany.status, 400);
    assert.match((await tooMany.json()).message, /Maximum is 20 images/);
  });
});

test("non-image files are refused and never count toward the minimum", async () => {
  await withUploadServer(async (url) => {
    const res = await post(url, 1, "application/pdf");
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /Invalid file type/);
  });
});

// ── security wiring unchanged ────────────────────────────────────────────────
const routeFor = (method, path) =>
  router.stack.find((l) => l.route?.path === path && l.route.methods[method])?.route;

test("every mutating image/publish route still requires auth and an admin role", () => {
  const protectedRoutes = [
    ["post", "/"],
    ["patch", "/hide/:id"],
    ["patch", "/images/:id"],
    ["put", "/images/:id"],
    ["delete", "/images/:id"],
    ["patch", "/images/:id/reorder"],
  ];
  for (const [method, path] of protectedRoutes) {
    const route = routeFor(method, path);
    assert.ok(route, `${method} ${path} exists`);
    assert.equal(route.stack[0].handle, auth.verifyJWT, `${method} ${path} → verifyJWT first`);

    // second handler is the role gate: no admin → 401, wrong role → 403
    const gate = route.stack[1].handle;
    assert.throws(() => gate({}, {}, () => {}), (e) => e.statusCode === 401);
    assert.throws(() => gate({ admin: { role: "visitor" } }, {}, () => {}), (e) => e.statusCode === 403);
  }
});

test("creation chain runs file/field validation before the controller, in order", () => {
  const names = routeFor("post", "/").stack.map((l) => l.handle);
  const idx = (fn) => names.indexOf(fn);
  assert.ok(idx(upload.handleUploadErrors) > -1);
  assert.ok(idx(validators.validateMinImagesToPublish) > idx(validators.validateCreateCar));
  assert.ok(idx(validators.validateMinImagesToPublish) < names.length - 1); // before createCar
});

test("there is no other route that can flip isHidden to visible", () => {
  const writers = router.stack
    .filter((l) => l.route && (l.route.methods.patch || l.route.methods.put || l.route.methods.post))
    .map((l) => `${Object.keys(l.route.methods)[0]} ${l.route.path}`);
  assert.deepEqual(writers.sort(), [
    "patch /features/:id",
    "patch /feature/:id",
    "patch /hide/:id",
    // Listing-details edit. It cannot flip isHidden: the validator rejects
    // unknown fields (isHidden/featured/isSold/images) and updateCarService
    // only writes a whitelist of detail fields — see car-update.test.js.
    "patch /:id",
    "patch /images/:id",
    "patch /images/:id/reorder",
    "patch /sold/:id",
    "post /",
    "put /images/:id",
  ].sort());
});

// ── malformed multipart handling (security regression) ───────────────────────
// Multer 1.4.5-lts.2 removed busboy's error listener on teardown, so crafted
// multipart payloads (CVE-2025-48997, CVE-2025-7338) could surface as an
// unhandled 'error' event and crash the whole Node process — no auth needed.
// Multer 2.x keeps a guard listener and funnels parser errors to Express, so
// these requests must now fail gracefully and the server must keep serving.
const postRaw = (url, body, boundary) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  });

test("malformed multipart requests are rejected gracefully, never crash", async () => {
  await withUploadServer(async (url) => {
    const boundary = "----safar-malformed-probe";

    // Empty field name — the CVE-2025-48997 trigger on multer 1.x.
    const emptyName = await postRaw(
      url,
      `--${boundary}\r\nContent-Disposition: form-data; name=""; filename="x.png"\r\n` +
        `Content-Type: image/png\r\n\r\n${"A".repeat(20)}\r\n--${boundary}--\r\n`,
      boundary,
    );
    assert.equal(emptyName.status, 400);
    assert.match((await emptyName.json()).message, /field name/i);

    // Truncated body: the closing boundary never arrives — must not hang or crash.
    const truncated = await postRaw(
      url,
      `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="x.png"\r\n` +
        `Content-Type: image/png\r\n\r\n${"B".repeat(100)}`,
      boundary,
    );
    assert.equal(truncated.status, 400);
    assert.match((await truncated.json()).message, /incomplete/i);

    // The server is still alive and accepts a valid upload afterwards.
    const ok = await post(url, 1);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).count, 1);
  });
});

// ── P0 hardening: explicit multipart limits ──────────────────────────────────
test("excessive text fields are rejected with 400 (fields limit)", async () => {
  await withUploadServer(async (url) => {
    const fd = new FormData();
    fd.append("images", new Blob([Buffer.alloc(20, 1)], { type: "image/png" }), "p0.png");
    for (let i = 0; i < 40; i++) fd.append(`f${i}`, "x");
    const res = await fetch(url, { method: "POST", body: fd });
    assert.equal(res.status, 400);
  });
});

test("request-size guard rejects >106MB before multer parses (413)", async () => {
  const err = await new Promise((resolve) =>
    upload.rejectOversizedRequests(
      { headers: { "content-length": String(200 * 1048576) } },
      {},
      resolve,
    ),
  );
  assert.equal(err.statusCode, 413);
  assert.match(err.message, /106 MB/);

  // Under the cap, missing, or garbage Content-Length all pass through.
  for (const headers of [
    { "content-length": String(10 * 1048576) },
    {},
    { "content-length": "not-a-number" },
  ]) {
    const ok = await new Promise((resolve) =>
      upload.rejectOversizedRequests({ headers }, {}, resolve),
    );
    assert.equal(ok, undefined);
  }
});

test("truncated multipart body is a 400, not a 500", async () => {
  await withUploadServer(async (url) => {
    const boundary = "----safar-truncated-400";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body:
        `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="x.png"\r\n` +
        `Content-Type: image/png\r\n\r\n${"B".repeat(100)}`,
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /incomplete/i);
  });
});

test("upload limiter keys by authenticated user, falls back to IP", async () => {
  const { uploadLimitKey } = await import(
    "../src/middlewares/rateLimiter.middleware.js"
  );
  assert.equal(
    uploadLimitKey({ admin: { _id: "user-1" }, ip: "1.2.3.4" }),
    "user:user-1",
  );
  assert.equal(uploadLimitKey({ ip: "1.2.3.4" }), "ip:1.2.3.4");
});

// ── dimension validation ─────────────────────────────────────────────────────
const { validateImageBuffers } = await import(
  "../src/middlewares/imageValidation.middleware.js"
);

const withValidatedUploadServer = async (fn) => {
  const app = express();
  app.post(
    "/up",
    upload.uploadMultiple,
    upload.handleUploadErrors,
    validateImageBuffers,
    (req, res) => res.json({ count: req.files.length }),
  );
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}/up`);
  } finally {
    await new Promise((r) => server.close(r));
  }
};

// Minimal hand-crafted headers: real magic bytes + real dimension fields.
const pngBuffer = (w, h) => {
  const b = Buffer.alloc(33, 0);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12);
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};
const jpegBuffer = (w, h) => {
  const b = Buffer.alloc(24, 0);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xc0; // SOI + SOF0
  b.writeUInt16BE(11, 4);
  b[6] = 0x08; // precision
  b.writeUInt16BE(h, 7);
  b.writeUInt16BE(w, 9);
  b[20] = 0xff; b[21] = 0xd9; // EOI
  return b;
};
const webpBuffer = (w, h) => {
  const b = Buffer.alloc(30, 0);
  b.write("RIFF", 0);
  b.write("WEBP", 8);
  b.write("VP8 ", 12);
  b[20] = 0x9d; b[21] = 0x01; b[22] = 0x2a; // frame tag + start code
  b.writeUInt16LE(w, 26);
  b.writeUInt16LE(h, 28);
  return b;
};
const postFile = (url, buffer, type, name) => {
  const fd = new FormData();
  fd.append("images", new Blob([buffer], { type }), name);
  return fetch(url, { method: "POST", body: fd });
};

test("images within the dimension cap upload fine", async () => {
  await withValidatedUploadServer(async (url) => {
    const cases = [
      [pngBuffer(100, 100), "image/png", "a.png"],
      [jpegBuffer(800, 600), "image/jpeg", "b.jpg"],
      [webpBuffer(640, 480), "image/webp", "c.webp"],
    ];
    for (const [buf, type, name] of cases) {
      const res = await postFile(url, buf, type, name);
      assert.equal(res.status, 200, name);
    }
  });
});

test("dimension bombs are rejected with 400", async () => {
  await withValidatedUploadServer(async (url) => {
    const cases = [
      [pngBuffer(13000, 100), "image/png", "a.png"],
      [jpegBuffer(100, 20000), "image/jpeg", "b.jpg"],
      [webpBuffer(15000, 15000), "image/webp", "c.webp"],
    ];
    for (const [buf, type, name] of cases) {
      const res = await postFile(url, buf, type, name);
      assert.equal(res.status, 400, name);
      assert.match((await res.json()).message, /dimensions/i);
    }
  });
});

test("unparseable dimensions fail open (ImageKit decides)", async () => {
  await withValidatedUploadServer(async (url) => {
    // Valid PNG magic bytes but no IHDR: passes the dimension guard as before.
    const res = await postFile(
      url,
      pngBuffer(100, 100).subarray(0, 8),
      "image/png",
      "truncated.png",
    );
    assert.equal(res.status, 200);
  });
});

// ── concurrency smoke ────────────────────────────────────────────────────────
test("concurrent uploads are both served", async () => {
  await withUploadServer(async (url) => {
    // NOTE: withUploadServer's chain has no validateImageBuffers, so plain
    // zero-filled blobs are fine here; this probes concurrency, not content.
    const one = () =>
      post(url, 20, "image/png").then(async (r) => ({
        status: r.status,
        count: (await r.json()).count,
      }));
    const [a, b] = await Promise.all([one(), one()]);
    assert.equal(a.status, 200);
    assert.equal(a.count, 20);
    assert.equal(b.status, 200);
    assert.equal(b.count, 20);
  });
});
