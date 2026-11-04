// Index inventory regression test.
//
// The Car index set is a deliberate, audited strategy (see the 2026-11-04
// index audit). This test snapshots the exact index definitions so that any
// future add/remove is a conscious, reviewed change — not an accident.

import test from "node:test";
import assert from "node:assert/strict";

const { default: Car } = await import("../src/models/car.model.js");

const specKey = (spec) =>
  JSON.stringify(Object.entries(spec).sort(([a], [b]) => (a < b ? -1 : 1)));

test("car index inventory matches the audited set", () => {
  const actual = new Set(Car.schema.indexes().map(([spec]) => specKey(spec)));

  // Audited 2026-11-04: 17 indexes. Removed as redundant/dead: single-field
  // brand (dominated by {brand,price} prefix), single-field price (dominated
  // by {isHidden,price} — every price query filters isHidden), single-field
  // isHidden (five compounds share the prefix), {isHidden,isSold} (no query
  // combines both). Added: images.public_id (multikey, for pre-deletion
  // reference checks that otherwise scan the whole collection per delete).
  const expected = new Set(
    [
      { slug: 1 }, // unique
      { creationOperationId: 1 }, // unique
      { model: 1 },
      { year: 1 },
      { fuelType: 1 },
      { bodyType: 1 },
      { vin: 1 },
      { province: 1 },
      { featured: 1 },
      { isSold: 1 },
      { createdBy: 1 },
      { brand: 1, price: 1 },
      { isHidden: 1, featured: 1 },
      { isHidden: 1, createdAt: -1 },
      { isHidden: 1, price: 1 },
      { isHidden: 1, mileage: 1 },
      { "images.public_id": 1 },
    ].map(specKey),
  );

  const missing = [...expected].filter((s) => !actual.has(s));
  const extra = [...actual].filter((s) => !expected.has(s));
  assert.deepEqual(missing, [], `missing indexes: ${missing.join(", ")}`);
  assert.deepEqual(extra, [], `unexpected indexes: ${extra.join(", ")}`);
  assert.equal(actual.size, 17);
});

test("removed indexes stay removed", () => {
  const specs = Car.schema.indexes().map(([spec]) => specKey(spec));
  const has = (obj) => specs.includes(specKey(obj));
  assert.equal(has({ brand: 1 }), false, "single-field brand is redundant");
  assert.equal(has({ price: 1 }), false, "single-field price is redundant");
  assert.equal(has({ isHidden: 1 }), false, "single-field isHidden is redundant");
  assert.equal(
    has({ isHidden: 1, isSold: 1 }),
    false,
    "{isHidden,isSold} compound is dead",
  );
});
