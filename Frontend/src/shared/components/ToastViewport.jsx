import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useToast } from "../../store/ui/ToastContext.jsx";
import { CheckIcon, CloseIcon } from "./icons.jsx";

const ICONS = {
  success: CheckIcon,
  error: null,
  info: null,
};

const STYLES = {
  success: "border-s-signal text-signal-dark",
  error: "border-s-danger text-danger",
  info: "border-s-brass text-brass-dark",
};

export const ToastViewport = () => {
  const { t } = useTranslation();
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 sm:start-auto sm:end-4 sm:translate-x-0 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm transition-all duration-200"
      role="region"
      aria-label={t("toast.region")}
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              "flex items-start gap-3 glass-panel-strong border-s-[3px] rounded-xl px-4 py-3",
              STYLES[toast.type],
            )}
          >
            {Icon ? (
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <span className="font-mono font-bold text-sm mt-0.5 shrink-0">
                {toast.type === "error" ? "!" : "i"}
              </span>
            )}
            <p className="text-sm text-bone flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label={t("toast.dismiss")}
              className="text-ash hover:text-bone mt-0.5 shrink-0"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
