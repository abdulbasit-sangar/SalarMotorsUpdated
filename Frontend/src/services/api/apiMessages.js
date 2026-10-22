import i18n from "../../i18n/index.js";
import { EXACT, PATTERNS } from "./apiMessageMap.js";

// Maps the backend's (English) error messages to translation keys so every
// toast / inline error shows in the active language WITHOUT changing the API
// contract. Anything not mapped falls back to the server's own text — never
// to a raw translation key. The table lives in apiMessageMap.js.

const tr = (key, message, params = {}) =>
  i18n.t(`server.${key}`, { ns: "errors", defaultValue: message, ...params });

export const localizeApiMessage = (message) => {
  if (typeof message !== "string") return message;
  if (EXACT[message]) return tr(EXACT[message], message);
  for (const [re, key, params] of PATTERNS) {
    const match = message.match(re);
    if (match) return tr(key, message, params(match));
  }
  return message; // unknown server text: shown as-is, never a raw key
};
