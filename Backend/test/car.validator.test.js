import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCreateCar,
  validateUpdateCar,
} from "../src/validators/car.validator.js";
import { CAR_BRANDS, LOCATIONS } from "../src/constants/car.constants.js";
import Car from "../src/models/car.model.js";

const runValidation = (middleware, body) =>
  new Promise((resolve, reject) => {
    const req = { body };
    middleware(req, {}, (error) => (error ? reject(error) : resolve(req.body)));
  });

test("car creation no longer requires steering type and strips the legacy property", async () => {
  const body = {
    title: "2020 Toyota Corolla",
    brand: CAR_BRANDS[0],
    model: "Corolla",
    year: 2020,
    price: 12000,
    province: LOCATIONS[0],
    steeringType: "LHD",
  };

  const validatedBody = await runValidation(validateCreateCar, body);

  assert.equal(validatedBody.title, body.title);
  assert.equal(validatedBody.province, body.province);
  assert.equal("steeringType" in validatedBody, false);
});

test("car updates ignore the legacy property and preserve other updates", async () => {
  const validatedBody = await runValidation(validateUpdateCar, {
    price: 13000,
    steeringType: "RHD",
  });

  assert.deepEqual(validatedBody, { price: 13000 });
});

test("car schema no longer defines the retired property or indexes", () => {
  assert.equal(Car.schema.path("steeringType"), undefined);

  const indexedFields = Car.schema
    .indexes()
    .flatMap(([keys]) => Object.keys(keys));
  assert.equal(indexedFields.includes("steeringType"), false);
});
