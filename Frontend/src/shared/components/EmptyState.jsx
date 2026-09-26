import { Button } from "./Button.jsx";

export const EmptyState = ({
  icon,
  title = "Nothing here yet",
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    {icon && (
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-graphite-100 text-ash">
        {icon}
      </div>
    )}
    <h3 className="font-display text-2xl font-semibold text-bone mb-2">{title}</h3>
    {description && <p className="text-ash text-sm max-w-sm mb-6">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
