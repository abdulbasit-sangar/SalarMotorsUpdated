import test from "node:test";
import assert from "node:assert/strict";
import {
  FORM_KEYS,
  carToForm,
  buildUpdatePayload,
} from "./listingFormModel.js";

const car = {
  _id: "1",
  title: "2020 Toyota Corolla",
  brand: "Toyota",
  model: "Corolla",
  year: 2020,
  price: 12000,
  currency: "USD",
  province: "Kabul",
  mileage: 50000,
  mileageUnit: "km",
  condition: "Used",
  color: "White",
  description: "Clean",
  importedDate: "2021-03-05T00:00:00.000Z",
  features: ["ABS", "Bluetooth"],
  images: [{ url: "u", public_id: "p" }],
  isHidden: true,
};

test("carToForm prefills every editable field as form strings", () => {
  const form = carToForm(car);
  assert.equal(form.year, "2020");
  assert.equal(form.price, "12000");
  assert.equal(form.importedDate, "2021-03-05");
  assert.deepEqual(form.features, ["ABS", "Bluetooth"]);
  for (const key of FORM_KEYS) assert.equal(typeof form[key], "string");
});

test("carToForm tolerates older listings with missing optional values", () => {
  const form = carToForm({ title: "Old", brand: "Toyota", model: "X" });
  assert.equal(form.color, "");
  assert.equal(form.currency, "USD");
  assert.equal(form.mileageUnit, "km");
  assert.deepEqual(form.features, []);
});

test("an untouched form produces an empty payload", () => {
  const original = carToForm(car);
  assert.deepEqual(buildUpdatePayload({ ...original }, original), {});
});

test("only changed fields are sent; images and status are never part of the form", () => {
  const original = carToForm(car);
  const payload = buildUpdatePayload(
    { ...original, price: "13000", title: "  New title  " },
    original,
  );
  assert.deepEqual(payload, { price: "13000", title: "New title" });
  assert.equal("images" in carToForm(car), false);
  assert.equal("isHidden" in carToForm(car), false);
});

test("clearing an optional field sends an empty string; non-clearable blanks are skipped", () => {
  const original = carToForm(car);
  const payload = buildUpdatePayload(
    { ...original, color: "", condition: "" },
    original,
  );
  assert.deepEqual(payload, { color: "" });
});

test("features are compared as a set and sent whole when they change", () => {
  const original = carToForm(car);
  assert.deepEqual(
    buildUpdatePayload({ ...original, features: ["Bluetooth", "ABS"] }, original),
    {},
  );
  assert.deepEqual(
    buildUpdatePayload({ ...original, features: ["ABS"] }, original),
    { features: ["ABS"] },
  );
  assert.deepEqual(
    buildUpdatePayload({ ...original, features: [] }, original),
    { features: [] },
  );
});
