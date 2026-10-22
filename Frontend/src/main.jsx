import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./shared/components/ErrorBoundary.jsx";
import { initI18n } from "./i18n/index.js";
import "./shared/styles/index.css";

const render = () =>
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );

// Translations (and <html lang/dir>) are ready before the first paint, so
// there is no flash of the wrong language or direction. If i18n fails to
// start, the app still renders (English text via defaults).
initI18n()
  .catch((error) => console.error("[i18n] init failed", error))
  .finally(render);
