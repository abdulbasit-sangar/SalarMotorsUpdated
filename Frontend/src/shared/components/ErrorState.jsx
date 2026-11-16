import { useTranslation } from "react-i18next";
import { RotateCw } from "lucide-react";

// Compact load-failure block: a small title, one short line, and the
// retry control below it — a try-again arrow icon on its own, no text
// button. The icon is the button: a static circular arrow (RotateCw),
// not a spinner. Clicking it retries; the "Try again" wording stays as
// its accessible label and hover tooltip. RotateCw is imported
// directly, as DashboardPage already does, so the shared icons file
// stays untouched. Same small size on every device.
export const ErrorState = ({ title, description, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
      <h3 className="font-display text-lg font-semibold text-bone">
        {title ?? t("errorState.title")}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-ash">
        {description ?? t("errorState.description")}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("actions.tryAgain")}
          title={t("actions.tryAgain")}
          className="mt-4 rounded-full p-2 transition-colors hover:bg-brass/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
        >
          <RotateCw
            className="h-6 w-6 text-brass"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
};
