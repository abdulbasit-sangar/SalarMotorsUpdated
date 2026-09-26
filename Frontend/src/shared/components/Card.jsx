import clsx from "clsx";

/**
 * Card — the base surface used across the app. `tag` renders the
 * signature corner-notch shape (see .tag-shape in shared/styles/index.css),
 * reserved for content that represents a single listing/record: car cards,
 * price badges, status pills. Plain surfaces (forms, panels) use `tag={false}`.
 */
export const Card = ({ tag = false, className, children, as: Component = "div", ...props }) => (
  <Component
    className={clsx(
      "bg-graphite-800 border border-steel",
      tag ? "tag-shape" : "rounded-sm",
      className
    )}
    {...props}
  >
    {children}
  </Component>
);
