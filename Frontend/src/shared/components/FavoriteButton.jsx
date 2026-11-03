import { useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { HeartIcon } from "./icons.jsx";
import { useFavorites } from "../../store/favorites/FavoritesContext.jsx";
import { useToast } from "../../store/ui/ToastContext.jsx";
import { parseApiError } from "../../services/api/client.js";

/**
 * FavoriteButton — heart toggle used on vehicle cards and the details page.
 * Stops click propagation/navigation so it's safe to place inside a <Link>
 * card (see CarCard.jsx) without triggering navigation to the details page.
 *
 * Heart tone: on the cards the button sits on a frosted-white circle
 * (bg-white/75) in BOTH themes, so a theme-adaptive heart turns invisible
 * in dark mode — there the heart stays permanently dark charcoal instead.
 * Everywhere else the button is theme-adaptive glass, so the heart follows
 * the theme. Pass tone="onLight" / tone="auto" to override the automatic
 * detection below.
 */
export const FavoriteButton = ({ carId, className, size = "md", tone }) => {
  const { t } = useTranslation();
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
      toast.error(parseApiError(err).message || t("favorites.updateError"));
    } finally {
      setPending(false);
    }
  };

  const dims = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  // Auto-detect a light button surface from the passed classes (the cards
  // pass bg-white/75); an explicit tone prop always wins.
  const onLightSurface = tone
    ? tone === "onLight"
    : /bg-white/.test(className || "");
  const idleHeartClass = onLightSurface ? "text-[#2D2926]" : "text-icon";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? t("favorites.remove") : t("favorites.add")}
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
          active ? "text-danger" : idleHeartClass,
        )}
      />
    </button>
  );
};
