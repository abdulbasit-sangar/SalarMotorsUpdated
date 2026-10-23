import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

// The ImageKit SDK validates its config at import time; dummy values keep it
// from throwing. Nothing here touches the network or a database.
process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const { default: Car } = await import("../src/models/car.model.js");
const { updateCarService, getAdminCarByIdService } = await import(
  "../src/services/car.service.js"
);
const { validateUpdateCar } = await import(
  "../src/validators/car.validator.js"
);
const { CAR_BRANDS, LOCATIONS } = await import(
  "../src/constants/car.constants.js"
);

const images = Array.from({ length: 6 }, (_, i) => ({
  url: `https://img.test/${i}.jpg`,
  public_id: `img-${i}`,
}));

// A real Mongoose document (real schema, setters and validators); only the
// database round-trip (findById / save) is replaced.
const makeDoc = (overrides = {}) => {
  const doc = new Car({
    title: "2020 Toyota Corolla",
    brand: CAR_BRANDS[0],
    model: "Corolla",
    year: 2020,
    price: 12000,
    province: LOCATIONS[0],
    color: "White",
    city: "Kabul",
    description: "Clean car",
    vin: "1HGCM82633A004352",
    mileage: 50000,
    fuelType: "Petrol",
    features: ["ABS", "Bluetooth"],
    images,
    featured: true,
    isHidden: false,
    isSold: false,
    ...overrides,
  });
  doc.save = async () => {
    await doc.validate();
    return doc;
  };
  return doc;
};

const stubFind = (doc) => mock.method(Car, "findById", async () => doc);

const runValidation = (body) =>
  new Promise((resolve, reject) => {
    validateUpdateCar({ body }, {}, (e) => (e ? reject(e) : resolve(body)));
  });

afterEach(() => mock.restoreAll());

test("update changes only the fields sent and leaves everything else intact", async () => {
  const doc = makeDoc();
  stubFind(doc);

  const result = await updateCarService(doc._id.toString(), {
    price: "13500",
    color: "Black",
  });

  assert.equal(result.price, 13500);
  assert.equal(result.color, "Black");
  // untouched
  assert.equal(result.title, "2020 Toyota Corolla");
  assert.equal(result.city, "Kabul");
  assert.equal(result.vin, "1HGCM82633A004352");
  assert.deepEqual(result.features, ["ABS", "Bluetooth"]);
  assert.equal(result.images.length, 6);
  assert.equal(result.featured, true);
  assert.equal(result.isHidden, false);
});

test("update never touches images or status flags even if present on the document", async () => {
  const doc = makeDoc({ isHidden: true, isSold: true });
  stubFind(doc);
  const result = await updateCarService(doc._id.toString(), { price: 1 });
  assert.equal(result.images.length, 6);
  assert.equal(result.isHidden, true);
  assert.equal(result.isSold, true);
});

test("an empty string clears optional values; mileage resets to its default", async () => {
  const doc = makeDoc();
  stubFind(doc);
  const result = await updateCarService(doc._id.toString(), {
    color: "",
    city: "",
    description: "",
    vin: "",
    fuelType: "",
    mileage: "",
  });
  assert.equal(result.color, undefined);
  assert.equal(result.city, undefined);
  assert.equal(result.description, undefined);
  assert.equal(result.vin, undefined);
  assert.equal(result.fuelType, undefined);
  assert.equal(result.mileage, 0);
});

test("required fields are never blanked by an empty value", async () => {
  const doc = makeDoc();
  stubFind(doc);
  const result = await updateCarService(doc._id.toString(), {
    title: "",
    brand: "",
    price: "",
  });
  assert.equal(result.title, "2020 Toyota Corolla");
  assert.equal(result.brand, CAR_BRANDS[0]);
  assert.equal(result.price, 12000);
});

test("features can be replaced as a whole and are de-duplicated", async () => {
  const doc = makeDoc();
  stubFind(doc);
  const result = await updateCarService(doc._id.toString(), {
    features: ["Sunroof", "Sunroof", "4x4"],
  });
  assert.deepEqual(result.features, ["Sunroof", "4x4"]);
});

test("omitting features leaves them unchanged", async () => {
  const doc = makeDoc();
  stubFind(doc);
  const result = await updateCarService(doc._id.toString(), { color: "Red" });
  assert.deepEqual(result.features, ["ABS", "Bluetooth"]);
});

test("schema validation still rejects bad values on update", async () => {
  const doc = makeDoc();
  stubFind(doc);
  await assert.rejects(
    () => updateCarService(doc._id.toString(), { year: 1990 }),
    (err) => err.name === "ValidationError",
  );
});

test("a missing listing is a 404 and a malformed id is a 400", async () => {
  mock.method(Car, "findById", async () => null);
  await assert.rejects(
    () => updateCarService("507f1f77bcf86cd799439011", { price: 1 }),
    (err) => err.statusCode === 404,
  );
  await assert.rejects(
    () => updateCarService("not-an-id", { price: 1 }),
    (err) => err.statusCode === 400,
  );
});

test("admin fetch returns a hidden listing (public fetch would not)", async () => {
  const doc = makeDoc({ isHidden: true });
  mock.method(Car, "findById", () => ({
    select: () => ({ lean: async () => doc.toObject() }),
  }));
  const car = await getAdminCarByIdService(doc._id.toString());
  assert.equal(car.isHidden, true);
});

test("update validator: accepts clearing optional fields and features", async () => {
  await assert.doesNotReject(() =>
    runValidation({ color: "", description: "", engineCC: "", features: ["ABS"] }),
  );
});

test("update validator: rejects blank required fields, status flags and images", async () => {
  await assert.rejects(() => runValidation({ title: "" }));
  await assert.rejects(() => runValidation({ price: "" }));
  await assert.rejects(() => runValidation({ isHidden: true }));
  await assert.rejects(() => runValidation({ featured: true }));
  await assert.rejects(() => runValidation({ images: [] }));
  await assert.rejects(() => runValidation({ features: ["Not A Feature"] }));
  await assert.rejects(() => runValidation({}));
});
