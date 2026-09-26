import { useState } from "react";
import clsx from "clsx";
import { HeartIcon } from "./icons.jsx";
import { useFavorites } from "../../store/favorites/FavoritesContext.jsx";
import { useToast } from "../../store/ui/ToastContext.jsx";
import { parseApiError } from "../../services/api/client.js";

/**
 * FavoriteButton — heart toggle used on vehicle cards and the details page.
 * Stops click propagation/navigation so it's safe to place inside a <Link>
 * card (see CarCard.jsx) without triggering navigation to the details page.
 */
export const FavoriteButton = ({ carId, className, size = "md" }) => {
  const { isFavorited, toggleFavorite } = useFavorites();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const active = isFavorited(carId);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    setPending(true);
    try {
      await toggleFavorite(carId);
    } catch (err) {
      toast.error(parseApiError(err).message || "Couldn't update favorites.");
    } finally {
      setPending(false);
    }
  };

  const dims = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={clsx(
        "flex items-center justify-center rounded-full glass-panel transition-all duration-200",
        "hover:scale-105 active:scale-95 disabled:opacity-60",
        dims,
        className,
      )}
    >
      <HeartIcon
        filled={active}
        className={clsx(
          iconDims,
          "transition-colors duration-200",
          active ? "text-danger" : "text-graphite",
        )}
      />
    </button>
  );
};
