import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
} from "../../services/favorites/favoritesApi.js";

const FavoritesContext = createContext(null);

/**
 * FavoritesProvider — loads the current device's favorited car IDs once on
 * mount and exposes optimistic add/remove. Backed entirely by the server
 * (GET/POST/DELETE /api/favorites, scoped by the anonymous X-Device-Id
 * header — see shared/utils/deviceId.js) so favorites persist across
 * refreshes and repeat visits, not just frontend state.
 */
export const FavoritesProvider = ({ children }) => {
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchFavorites()
      .then(({ favoritedCarIds }) => {
        if (cancelled) return;
        setFavoriteIds(new Set(favoritedCarIds || []));
      })
      .catch(() => {
        // Favorites are a non-critical enhancement — fail silently and
        // leave the heart icons in their default (unfavorited) state
        // rather than blocking the rest of the site.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isFavorited = useCallback((carId) => favoriteIds.has(carId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (carId) => {
      const wasFavorited = favoriteIds.has(carId);

      // Optimistic update — flip immediately, roll back on failure.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.delete(carId);
        else next.add(carId);
        return next;
      });

      try {
        if (wasFavorited) await apiRemoveFavorite(carId);
        else await apiAddFavorite(carId);
        return !wasFavorited;
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) next.add(carId);
          else next.delete(carId);
          return next;
        });
        throw err;
      }
    },
    [favoriteIds],
  );

  const value = useMemo(
    () => ({ favoriteIds, isFavorited, toggleFavorite, ready }),
    [favoriteIds, isFavorited, toggleFavorite, ready],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
};
