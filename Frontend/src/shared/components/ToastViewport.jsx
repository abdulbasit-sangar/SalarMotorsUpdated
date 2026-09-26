import clsx from "clsx";
import { useToast } from "../../store/ui/ToastContext.jsx";
import { CheckIcon, CloseIcon } from "./icons.jsx";

const ICONS = {
  success: CheckIcon,
  error: null,
  info: null,
};

const STYLES = {
  success: "border-l-signal text-signal-dark",
  error: "border-l-danger text-danger",
  info: "border-l-brass text-brass-dark",
};

export const ToastViewport = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm transition-all duration-200"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "flex items-start gap-3 glass-panel-strong border-l-[3px] rounded-xl px-4 py-3",
              STYLES[t.type],
            )}
          >
            {Icon ? (
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <span className="font-mono font-bold text-sm mt-0.5 shrink-0">
                {t.type === "error" ? "!" : "i"}
              </span>
            )}
            <p className="text-sm text-bone flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
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
