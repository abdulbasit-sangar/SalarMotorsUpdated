import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { SunIcon, MoonIcon } from "./icons.jsx";
import { getTheme, toggleTheme, THEME_EVENT, THEMES } from "../theme/theme.js";

/**
 * ThemeToggle — light/dark mode button. Rendered in the navbar (and the
 * admin header). Shows a moon in light mode and a sun in dark mode; the
 * choice persists in localStorage and follows the OS preference until the
 * user picks explicitly.
 */
export const ThemeToggle = ({ className = "" }) => {
  const { t } = useTranslation("layout");
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const sync = () => setThemeState(getTheme());
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const dark = theme === THEMES.DARK;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t(dark ? "nav.themeLight" : "nav.themeDark")}
      title={t(dark ? "nav.themeLight" : "nav.themeDark")}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bone",
        "transition-all duration-200 hover:bg-brass/10 hover:text-brass-dark",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
        className,
      )}
    >
      {dark ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
};
