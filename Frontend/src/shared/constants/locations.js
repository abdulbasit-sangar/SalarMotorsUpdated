/**
 * locations.js — the special `province`/Location values that back the
 * "Dubai Cars" and "On The Way" catalog categories.
 *
 * These strings MUST match Backend/src/constants/car.constants.js exactly
 * (LOCATION_DUBAI / LOCATION_ON_THE_WAY) — they're what gets sent as the
 * `province` filter param (e.g. `/listings?province=Dubai`), and what gets
 * saved as a listing's `province` on Create Listing. Defined once here so
 * the Navbar, Footer, Home page, and Admin Dashboard never drift out of
 * sync with each other or with the backend.
 */
export const LOCATION_DUBAI = "Dubai";

export const LOCATION_ON_THE_WAY = {
  AMERICA_TO_HERAT: "From America to Herat",
  DUBAI_TO_HERAT: "From Dubai to Herat",
};

export const dubaiCarsPath = () =>
  `/listings?province=${encodeURIComponent(LOCATION_DUBAI)}`;

export const onTheWayPath = (destination) =>
  `/listings?province=${encodeURIComponent(destination)}`;
