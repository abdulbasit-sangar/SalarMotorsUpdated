import clsx from "clsx";

const VARIANTS = {
  brass: "bg-brass/15 text-brass-dark border-brass/30",
  signal: "bg-signal/12 text-signal-dark border-signal/30",
  neutral: "bg-graphite-800 text-ash border-steel",
  danger: "bg-danger/12 text-danger border-danger/30",
  glass: "bg-white/70 text-graphite backdrop-blur-md border-white/60 shadow-sm",
};

export const Badge = ({ variant = "neutral", className, children }) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium uppercase tracking-wider",
      "border rounded-full leading-none",
      VARIANTS[variant],
      className
    )}
  >
    {children}
  </span>
);
