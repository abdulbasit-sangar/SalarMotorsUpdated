// Maps between a saved listing and the Create/Edit form's string-based state,
// and builds the minimal PATCH payload (only what the admin actually changed).

// Same fields, in the same shape, as CreateListingPage's form state.
export const FORM_KEYS = [
  "title",
  "brand",
  "model",
  "year",
  "price",
  "currency",
  "province",
  "city",
  "mileage",
  "mileageUnit",
  "fuelType",
  "bodyType",
  "transmission",
  "condition",
  "engineCC",
  "color",
  "vin",
  "sellerPhone",
  "sellerWhatsapp",
  "sellerLocation",
  "description",
  "importedDate",
];

const DEFAULTS = { currency: "USD", mileageUnit: "km" };

// These can never be sent blank (the backend would reject or ignore them);
// an untouched blank value is simply left out of the payload.
const NOT_CLEARABLE = new Set(["currency", "mileageUnit", "condition"]);

const toFormValue = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return DEFAULTS[key] ?? "";
  }
  if (key === "importedDate") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  return String(value);
};

export const carToForm = (car) => {
  const form = {};
  for (const key of FORM_KEYS) form[key] = toFormValue(key, car?.[key]);
  form.features = Array.isArray(car?.features) ? [...car.features] : [];
  return form;
};

const sameSet = (a, b) =>
  a.length === b.length && [...a].sort().join("\u0000") === [...b].sort().join("\u0000");

/**
 * Only fields whose value differs from the loaded listing are returned, so a
 * save can never reset something the admin did not touch.
 */
export const buildUpdatePayload = (form, original) => {
  const payload = {};

  for (const key of FORM_KEYS) {
    const next = String(form[key] ?? "").trim();
    const prev = String(original[key] ?? "").trim();
    if (next === prev) continue;
    if (next === "" && NOT_CLEARABLE.has(key)) continue;
    payload[key] = next;
  }

  if (!sameSet(form.features ?? [], original.features ?? [])) {
    payload.features = form.features ?? [];
  }

  return payload;
};
