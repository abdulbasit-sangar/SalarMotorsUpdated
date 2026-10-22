import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_NAMESPACE,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  isSupportedLanguage,
  readStoredLanguage,
  writeStoredLanguage,
} from "./config.js";

// English is the default and the fallback, so it ships in the main bundle.
// Pashto and Dari are separate chunks fetched only when selected.
const englishModules = import.meta.glob("../locales/en/*.json", {
  eager: true,
  import: "default",
});
const lazyModules = import.meta.glob(["../locales/*/*.json", "!../locales/en/*.json"], {
  import: "default",
});

const bundleName = (path) => path.split("/").pop().replace(".json", "");

const englishResources = Object.fromEntries(
  Object.entries(englishModules).map(([path, data]) => [bundleName(path), data]),
);

const loaded = new Set([DEFAULT_LANGUAGE]);

// Fetches (once) every namespace of a language and registers it with i18next.
export const loadLanguageResources = async (code) => {
  if (loaded.has(code)) return;
  const entries = Object.entries(lazyModules).filter(([path]) =>
    path.includes(`/locales/${code}/`),
  );
  if (!entries.length) throw new Error(`No translation files for "${code}"`);
  const bundles = await Promise.all(
    entries.map(async ([path, load]) => [bundleName(path), await load()]),
  );
  bundles.forEach(([ns, data]) => i18n.addResourceBundle(code, ns, data, true, true));
  loaded.add(code);
};

const FONT_LINK_ID = "rtl-font";
const RTL_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap";

// Pashto/Dari glyphs are not in Inter, so the Arabic-script font is only
// requested when an RTL language is first activated.
const ensureRtlFont = () => {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = RTL_FONT_HREF;
  document.head.appendChild(link);
};

// Keeps <html lang/dir>, the tab title and the meta description in sync with
// the active language. Runs on every language change and once at startup.
export const applyDocumentLanguage = (code) => {
  if (typeof document === "undefined") return;
  const meta = getLanguageMeta(code);
  const root = document.documentElement;
  root.lang = meta.htmlLang;
  root.dir = meta.dir;
  if (meta.dir === "rtl") ensureRtlFont();

  const title = i18n.t("meta.title", { ns: "common", defaultValue: "" });
  const description = i18n.t("meta.description", { ns: "common", defaultValue: "" });
  if (title) document.title = title;
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag && description) descTag.setAttribute("content", description);
};

// Switches language: loads its resources first (so the UI never flashes raw
// keys), then persists the explicit choice. Returns false if it could not
// load, leaving the current language untouched.
export const setLanguage = async (code) => {
  if (!isSupportedLanguage(code)) return false;
  try {
    await loadLanguageResources(code);
  } catch (error) {
    console.error("[i18n] could not load language", code, error);
    return false;
  }
  await i18n.changeLanguage(code);
  writeStoredLanguage(code);
  return true;
};

export const initI18n = async () => {
  if (i18n.isInitialized) return i18n;

  // Only an explicit, previously stored choice is honoured. No browser
  // detection: English stays the default and a returning user's selection is
  // never overridden.
  const initial = readStoredLanguage() ?? DEFAULT_LANGUAGE;

  await i18n.use(initReactI18next).init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: false,
    load: "currentOnly",
    ns: NAMESPACES,
    defaultNS: DEFAULT_NAMESPACE,
    resources: { [DEFAULT_LANGUAGE]: englishResources },
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
    react: { useSuspense: false },
    // Missing keys are loud in development and silent (never a raw key) in
    // production — the English fallback covers a missing translation.
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key "${ns}:${key}" for ${lngs}`);
    },
    parseMissingKeyHandler: (key) => (import.meta.env.DEV ? key : ""),
  });

  i18n.on("languageChanged", applyDocumentLanguage);

  if (initial !== DEFAULT_LANGUAGE) {
    try {
      await loadLanguageResources(initial);
      await i18n.changeLanguage(initial);
    } catch (error) {
      console.error("[i18n] stored language unavailable, using English", error);
    }
  }
  applyDocumentLanguage(i18n.language);
  return i18n;
};

export default i18n;
