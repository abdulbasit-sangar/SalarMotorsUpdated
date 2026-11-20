import { useTranslation } from "react-i18next";
import { Button } from "./Button.jsx";

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  compact = false,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center text-center py-10 px-6"
          : "flex flex-col items-center justify-center text-center py-16 px-6"
      }
    >
      {icon && (
        <div
          className={
            compact
              ? "mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-graphite-100 text-ash"
              : "mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-graphite-100 text-ash"
          }
        >
          {icon}
        </div>
      )}
      <h3
        className={
          compact
            ? "font-display text-lg font-semibold text-bone mb-3"
            : "font-display text-2xl font-semibold text-bone mb-2"
        }
      >
        {title ?? t("emptyState.title")}
      </h3>
      {description && (
        <p
          className={
            compact
              ? "text-ash text-xs max-w-sm mb-4"
              : "text-ash text-sm max-w-sm mb-6"
          }
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        compact ? (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionIcon}
            {actionLabel}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
};
