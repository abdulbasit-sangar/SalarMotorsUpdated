import { useEffect, useState } from "react";
import { CarCard, CarCardGrid } from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { HeartIcon } from "../../../shared/components/icons.jsx";
import { useFavorites } from "../../../store/favorites/FavoritesContext.jsx";
import { fetchFavorites } from "../../../services/favorites/favoritesApi.js";

export default function FavoritesPage() {
  const { favoriteIds, ready } = useFavorites();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchFavorites()
      .then(({ cars }) => setCars(cars || []))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactive removal: when a heart is un-toggled anywhere (including on
  // this page's own cards), drop it from the local list immediately —
  // no refetch, no full page refresh (spec requirement #6).
  useEffect(() => {
    if (!ready) return;
    setCars((prev) => prev.filter((car) => favoriteIds.has(car._id)));
  }, [favoriteIds, ready]);

  return (
    <div className="container-page py-8 sm:py-10">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        Saved
      </p>
      <h1 className="font-display text-4xl font-semibold text-bone mb-8">
        Your Favorites
      </h1>

      {error ? (
        <ErrorState onRetry={load} />
      ) : loading ? (
        <CarCardGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <CarCardSkeleton key={i} premium />
          ))}
        </CarCardGrid>
      ) : cars.length ? (
        <CarCardGrid>
          {cars.map((car) => (
            <CarCard key={car._id} car={car} premium />
          ))}
        </CarCardGrid>
      ) : (
        <EmptyState
          icon={<HeartIcon className="w-10 h-10" />}
          title="No favorites yet"
          description="Tap the heart on any listing to save it here."
          actionLabel="Browse listings"
          onAction={() => (window.location.href = "/listings")}
        />
      )}
    </div>
  );
}
