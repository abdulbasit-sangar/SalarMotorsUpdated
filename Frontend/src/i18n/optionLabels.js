import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./index.js";

// Backend option values (provinces, features, fuel types, …) are DATA: they
// are sent to the API and stored on listings exactly as the backend defines
// them, so they never change. Only the *label shown to people* is translated.
//
// Lookup is `options:<group>.<normalized value>` with the raw value as the
// default, so a value the translations don't know yet (e.g. a newly added
// feature) displays as its original text — never as a translation key.
export const optionKey = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const useOptionLabel = () => {
  const { t } = useTranslation("options");
  return useCallback(
    (group, value) =>
      value === undefined || value === null || value === ""
        ? ""
        : t(`${group}.${optionKey(value)}`, { defaultValue: String(value) }),
    [t],
  );
};

// Non-hook variant for plain utility functions (e.g. carLocation). Callers'
// components re-render on language change through their own useTranslation.
export const translateOption = (group, value) =>
  value === undefined || value === null || value === ""
    ? ""
    : i18n.t(`${group}.${optionKey(value)}`, {
        ns: "options",
        defaultValue: String(value),
      });
