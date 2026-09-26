import test from "node:test";
import assert from "node:assert/strict";
import { hashListingRequest } from "../src/utils/requestHash.js";
import { validateIdempotencyKey } from "../src/services/listingCreation.service.js";

test("listing request hashes are stable when field order changes", () => {
  const first = hashListingRequest(
    { title: "Toyota", features: ["abs"], price: "10" },
    [],
  );
  const second = hashListingRequest(
    { price: "10", features: ["abs"], title: "Toyota" },
    [],
  );
  assert.equal(first, second);
});

test("listing request hashes include image content", () => {
  const first = hashListingRequest({}, [
    { originalname: "a.jpg", mimetype: "image/jpeg", buffer: Buffer.from("a") },
  ]);
  const second = hashListingRequest({}, [
    { originalname: "a.jpg", mimetype: "image/jpeg", buffer: Buffer.from("b") },
  ]);
  assert.notEqual(first, second);
});

test("idempotency keys must be present and constrained", () => {
  assert.doesNotThrow(() => validateIdempotencyKey("a".repeat(16)));
  assert.throws(() => validateIdempotencyKey("short"), /Idempotency-Key/);
  assert.throws(
    () => validateIdempotencyKey("a".repeat(16) + "!"),
    /Idempotency-Key/,
  );
});
