import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, getLanguageMeta } from "./config.js";
import { setLanguage } from "./index.js";

// Subscribes the caller to language changes (re-renders on switch).
export const useLanguage = () => {
  const { i18n } = useTranslation();
  const meta = getLanguageMeta(i18n.language);
  const change = useCallback((code) => setLanguage(code), []);
  return {
    language: meta.code,
    dir: meta.dir,
    isRtl: meta.dir === "rtl",
    languages: LANGUAGES,
    setLanguage: change,
  };
};
