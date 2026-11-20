import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ChevronLeftIcon } from "./icons.jsx";

// Reusable "< Cars" back button — the same button above "Your Favorites"
// and at the top of the car details page. The chevron mirrors in RTL.
export const BackToCarsButton = ({ className = "" }) => {
  const { t } = useTranslation("catalog");
  return (
    <Link
      to="/listings"
      aria-label={t("details.back")}
      className={clsx(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-card bg-white/70 px-3 text-sm font-semibold text-bone shadow-sm transition-all hover:border-brass hover:text-brass-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
        className,
      )}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      {t("favorites.backToCars")}
    </Link>
  );
};
