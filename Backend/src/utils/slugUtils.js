/**
 * Generates a URL-friendly slug from a car title.
 * Example: "Toyota Corolla 2022 (Lahore)" → "toyota-corolla-2022-lahore"
 */
export const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")       // spaces and underscores → hyphens
    .replace(/[^\w-]+/g, "")       // remove non-word chars except hyphens
    .replace(/--+/g, "-")          // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");      // trim leading/trailing hyphens
};
