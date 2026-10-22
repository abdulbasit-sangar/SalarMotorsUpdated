import { useTranslation } from "react-i18next";
import { Button } from "./Button.jsx";

export const ErrorState = ({ title, description, onRetry }) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="w-14 h-14 rounded-full bg-danger/10 border border-danger/25 flex items-center justify-center mb-5">
      <span className="text-danger font-display text-xl font-semibold">!</span>
    </div>
    <h3 className="font-display text-2xl font-semibold text-bone mb-2">{title ?? t("errorState.title")}
    </h3>
    <p className="text-ash text-sm max-w-sm mb-6">
      {description ?? t("errorState.description")}
    </p>
    {onRetry && (
      <Button variant="secondary" onClick={onRetry}>
        {t("actions.tryAgain")}
      </Button>
    )}
  </div>
  );
};
