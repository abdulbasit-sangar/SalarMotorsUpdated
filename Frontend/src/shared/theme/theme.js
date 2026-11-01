/**
 * theme.js — light/dark mode helpers.
 *
 * The initial theme is applied by the inline script in index.html BEFORE
 * first paint (no light/dark flash). Everything here runs after that and
 * only flips `data-theme` on <html> (plus a `dark` class for convenience);
 * every color on the site resolves through CSS variables
 * (see index.css `html[data-theme="dark"]`), so one flip recolors the whole
 * app with no per-component changes.
 */
export const THEME_KEY = "safar-theme";
export const THEME_EVENT = "safar:theme-change";
export const THEMES = { LIGHT: "light", DARK: "dark" };

export const getTheme = () => {
  if (typeof document === "undefined") return THEMES.LIGHT;
  const t = document.documentElement.dataset.theme;
  if (t === THEMES.DARK || t === THEMES.LIGHT) return t;
  return document.documentElement.classList.contains("dark")
    ? THEMES.DARK
    : THEMES.LIGHT;
};

const syncMeta = (theme) => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === THEMES.DARK ? "#121419" : "#14171C");
  }
};

export const setTheme = (theme, { persist = true } = {}) => {
  const next = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
  const root = document.documentElement;
  // Brief global transition so every surface cross-fades smoothly instead
  // of snapping (removed right after; see index.css `html.theme-transition`).
  root.classList.add("theme-transition");
  root.classList.toggle("dark", next === THEMES.DARK);
  root.dataset.theme = next;
  syncMeta(next);
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode — theme just won't persist */
    }
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
  window.setTimeout(() => root.classList.remove("theme-transition"), 350);
};

export const toggleTheme = () =>
  setTheme(getTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
