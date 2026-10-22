// Language configuration — pure data + tiny helpers, no i18next import so it
// can be unit-tested and used anywhere without pulling in the library.

export const DEFAULT_LANGUAGE = "en";

// `label` is the language's own name (endonym), shown in the selector.
// `htmlLang` is the BCP-47 tag written to <html lang>.
export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr", htmlLang: "en" },
  { code: "ps", label: "پښتو", dir: "rtl", htmlLang: "ps" },
  { code: "fa-AF", label: "دری", dir: "rtl", htmlLang: "fa-AF" },
];

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => l.code);

// One JSON file per namespace under src/locales/<lng>/<ns>.json
export const NAMESPACES = [
  "common",
  "layout",
  "home",
  "catalog",
  "auth",
  "admin",
  "validation",
  "errors",
  "options",
];
export const DEFAULT_NAMESPACE = "common";

export const STORAGE_KEY = "safar.language";

export const isSupportedLanguage = (code) => SUPPORTED_LANGUAGES.includes(code);

export const getLanguageMeta = (code) =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

export const getDirection = (code) => getLanguageMeta(code).dir;
export const isRtlLanguage = (code) => getDirection(code) === "rtl";

// Numbers/dates always use Latin digits and the Gregorian calendar so prices,
// phone numbers, VINs and years match stored data and stay unambiguous. Month
// names, grouping and plural rules still follow the active language. Change
// here (one place) if Eastern-Arabic digits or the Solar Hijri calendar are
// ever wanted.
export const NUMBERING_SYSTEM = "latn";
export const CALENDAR = "gregory";

// Numbers use ONE convention in every language ("12,500", Latin digits).
// Locale grouping is not safe for prices: Pashto's CLDR data groups with "."
// ("12.500"), which a reader could take for 12.5. Dates and month names still
// follow the language (see intlLocale below).
export const NUMBER_LOCALE = "en-US";

export const intlLocale = (code) =>
  `${isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE}-u-ca-${CALENDAR}-nu-${NUMBERING_SYSTEM}`;

// ── Persistence (localStorage, always guarded — it can throw or be absent) ──
export const readStoredLanguage = (storage = globalThis.localStorage) => {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
};

export const writeStoredLanguage = (code, storage = globalThis.localStorage) => {
  try {
    if (isSupportedLanguage(code)) storage?.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode / quota: the choice still applies for this session */
  }
};
