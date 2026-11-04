// Catalog image payload optimization (Option A).
//
// Verifies: public catalog surfaces return images with ONLY the `url`
// property (no `public_id`), the full image array is preserved (carousel +
// photo-count badge keep working), admin list views keep complete image
// objects, and the vehicle detail endpoint still returns the full gallery.

import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const Car = (await import("../src/models/car.model.js")).default;
const {
  getAllCarsService,
  searchCarsService,
  filterCarsService,
  getFeaturedCarsService,
  getSimilarCarsService,
  getCarByIdService,
} = await import("../src/services/car.service.js");

afterEach(() => mock.restoreAll());

const makeImages = (n) =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://ik.imagekit.io/safar123/safar/cars/car_${i}.jpg?tr=w-800,q-80`,
    public_id: `safar/cars/car_${i}`,
  }));

const makeDocs = (n, imagesPerCar = 5) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `691a2b3c4d5e6f7890ab${String(i).padStart(4, "0")}`.slice(0, 24),
    title: `Car ${i}`,
    brand: i % 2 === 0 ? "Toyota" : "Honda",
    model: "Model",
    price: 100 + i,
    createdAt: new Date(Date.now() - i * 1000),
    isHidden: false,
    featured: i === 0,
    isSold: false,
    images: makeImages(imagesPerCar),
  }));

// Applies the real Mongoose projection semantics for the image field:
// "images.url" keeps only the url per image; "images" or exclusion ("-__v")
// keeps the complete image objects.
const applyImageProjection = (doc, selectStr) => {
  if (!selectStr || selectStr.trim().startsWith("-")) return doc;
  const fields = selectStr.split(/\s+/);
  if (fields.includes("images.url") && !fields.includes("images")) {
    return {
      ...doc,
      images: (doc.images || []).map(({ url }) => ({ url })),
    };
  }
  return doc;
};

const installCarMocks = (docs) => {
  const chain = (filter, executor) => {
    const q = {
      _filter: filter,
      _select: null,
      _sort: null,
      _skip: 0,
      _limit: null,
      select(s) { q._select = s; return q; },
      sort(s) { q._sort = s; return q; },
      skip(n) { q._skip = n; return q; },
      limit(n) { q._limit = n; return q; },
      async lean() { return executor(q); },
    };
    return q;
  };
  const runFind = (q) => {
    let out = docs.filter((d) => {
      const f = q._filter || {};
      if (f.isHidden === false && d.isHidden !== false) return false;
      if (f.featured === true && d.featured !== true) return false;
      if (f.featured?.$ne === true && d.featured === true) return false;
      return true;
    });
    if (q._sort?.createdAt === -1) out = [...out].sort((a, b) => b.createdAt - a.createdAt);
    const lim = q._limit ?? out.length;
    out = out.slice(q._skip, q._skip + lim);
    return out.map((d) => applyImageProjection(d, q._select));
  };
  mock.method(Car, "find", (filter) => chain(filter, runFind));
  mock.method(Car, "findOne", (filter) =>
    chain(filter, (q) => {
      const doc = docs.find((d) => String(d._id) === String(filter._id));
      return doc ? applyImageProjection(doc, q._select) : null;
    }),
  );
  mock.method(Car, "countDocuments", async () => docs.length);
};

const assertUrlOnly = (images, label) => {
  assert.ok(images.length > 0, `${label}: expected images`);
  for (const image of images) {
    assert.deepEqual(
      Object.keys(image),
      ["url"],
      `${label}: image must carry only url, got ${JSON.stringify(image)}`,
    );
  }
};

// ── public catalog surfaces: url-only, array intact ─────────────────────────

test("public catalog strips public_id but keeps every image", async () => {
  installCarMocks(makeDocs(3, 5));
  const res = await getAllCarsService({ page: 1, limit: 10 });
  assert.equal(res.cars.length, 2, "featured doc excluded by the one-category rule");
  for (const car of res.cars) {
    assert.equal(car.images.length, 5, "carousel + count badge need all images");
    assertUrlOnly(car.images, "catalog");
  }
});

test("search, filter, featured and similar strips public_id", async () => {
  installCarMocks(makeDocs(4, 4));
  const s = await searchCarsService({ keyword: "Toyota", page: 1, limit: 10 });
  assertUrlOnly(s.cars[0].images, "search");

  const f = await filterCarsService({ page: 1, limit: 10 });
  assertUrlOnly(f.cars[0].images, "filter");

  const feat = await getFeaturedCarsService(8);
  assert.ok(feat.cars.length > 0);
  assertUrlOnly(feat.cars[0].images, "featured");

  const sim = await getSimilarCarsService("691a2b3c4d5e6f7890ab0000");
  assertUrlOnly(sim.cars[0].images, "similar");
});

// ── admin + detail: full image objects preserved ────────────────────────────

test("admin catalog keeps complete image objects (public_id intact)", async () => {
  installCarMocks(makeDocs(2, 3));
  const admin = { _id: "admin1", role: "superadmin" };
  const res = await getAllCarsService({ page: 1, limit: 10 }, true, admin);
  for (const car of res.cars) {
    for (const image of car.images) {
      assert.ok(image.public_id, "admin views keep public_id");
      assert.ok(image.url, "admin views keep url");
    }
  }
});

test("vehicle detail returns the complete gallery in order", async () => {
  const docs = makeDocs(2, 6);
  installCarMocks(docs);
  const car = await getCarByIdService("691a2b3c4d5e6f7890ab0000");
  assert.equal(car.images.length, 6);
  assert.deepEqual(
    car.images.map((i) => i.public_id),
    docs[0].images.map((i) => i.public_id),
    "gallery order and public_ids preserved",
  );
});

test("vehicles with no images are handled gracefully", async () => {
  const docs = makeDocs(1, 0);
  docs[0].featured = false; // keep it in the public catalog
  installCarMocks(docs);
  const res = await getAllCarsService({ page: 1, limit: 10 });
  assert.deepEqual(res.cars[0].images, []);
  const detail = await getCarByIdService("691a2b3c4d5e6f7890ab0000");
  assert.deepEqual(detail.images, []);
});
