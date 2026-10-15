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
    const write = mock.method(Car, "findOneAndUpdate", () => query({ title: "T", isHidden: false }));
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
    "patch /images/:id",
    "patch /images/:id/reorder",
    "patch /sold/:id",
    "post /",
    "put /images/:id",
  ].sort());
});
