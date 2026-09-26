/**
 * CURRENCY_SYMBOLS — mirrors Backend/src/constants/car.constants.js
 * (CURRENCIES). Kept as a small static map on the frontend rather than
 * fetched, since it's used in `formatPrice`, a plain utility function that
 * runs everywhere (cards, details, admin tables) without guaranteed access
 * to the async `/cars/options` response.
 */
const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  AED: "AED",
  AFN: "AFN",
};

/**
 * formatPrice — renders a car price with its currency, reusably, everywhere
 * a price is shown (cards, featured/sponsored, details, search, similar,
 * admin listings). Price is always a plain Number in the database — this
 * is the ONLY place formatting happens, never stored as a formatted string.
 */
export const formatPrice = (price, currency = "USD") => {
  if (price === undefined || price === null) return "—";
  const amount = new Intl.NumberFormat("en-US").format(price);
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "";
  return symbol ? `${amount} ${symbol}` : amount;
};

/**
 * formatMileage — reusable everywhere mileage is shown. Unit is stored
 * separately from the numeric value (Car.mileageUnit) — never baked into
 * the number itself — so this is the only place "85,000 km" vs
 * "52,000 mi" text is assembled.
 */
export const formatMileage = (mileage, unit = "km") => {
  if (mileage === undefined || mileage === null) return null;
  const label = unit === "miles" ? "mi" : "km";
  return `${new Intl.NumberFormat("en-US").format(mileage)} ${label}`;
};

/**
 * Returns the first image URL for a car, or null if it has none.
 * Car.images is [{ url, public_id }], per car.model.js.
 */
export const getPrimaryImage = (car) => car?.images?.[0]?.url || null;

/** Number of images a car has — used by the camera-count badge on CarCard. */
export const imageCount = (car) => car?.images?.length || 0;

export const carTitle = (car) =>
  car?.title || [car?.brand, car?.model, car?.year].filter(Boolean).join(" ");

export const carLocation = (car) => [car?.city, car?.province].filter(Boolean).join(", ");

export const formatDate = (dateValue) => {
  if (!dateValue) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" }).format(
      new Date(dateValue)
    );
  } catch {
    return null;
  }
};
