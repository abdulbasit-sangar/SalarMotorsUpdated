import { forwardRef } from "react";
import clsx from "clsx";
import { Spinner } from "./Spinner.jsx";

const VARIANTS = {
  primary:
    "bg-brass text-graphite-950 shadow-sm hover:bg-brass-light hover:shadow-card active:bg-brass-dark",
  secondary:
    "bg-white/70 text-bone border border-card backdrop-blur-md hover:border-brass hover:text-brass-dark",
  ghost: "bg-transparent text-ash hover:text-bone hover:bg-graphite-800",
  glass: "glass-panel text-bone hover:bg-white/80",
  danger: "bg-danger text-white hover:brightness-110",
};

const SIZES = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef(
  (
    {
      as: Component = "button",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-semibold tracking-tight",
          "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          "rounded-xl",
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...props}
      >
        {loading && <Spinner size={16} />}
        {children}
      </Component>
    );
  }
);

Button.displayName = "Button";
