import { useAsyncData } from "./useAsyncData.js";
import { fetchCarOptions } from "../../services/cars/carsApi.js";

/**
 * useCarOptions — fetches the centralized car dropdown options
 * (brands, provinces, years, engineCC, steering, fuelTypes, bodyTypes,
 * transmissions, conditions) from GET /api/cars/options.
 *
 * Shared by every component that renders a Brand/Province/Year/Engine CC
 * dropdown (CreateListingPage, FilterPanel, HeroSearchBar) so the fetch,
 * loading, and error handling logic lives in exactly one place. The
 * underlying request is deduped/cached by the carsApi cache layer, so
 * mounting this hook in multiple components at once does not cause
 * multiple network calls.
 *
 * `options` is null until the fetch resolves — callers should fall back to
 * an empty array for any list they read off it while loading.
 */
export const useCarOptions = () => {
  const { data: options, loading, error, refetch } = useAsyncData(
    fetchCarOptions,
    [],
  );

  return { options, loading, error, refetch };
};
