import { Skeleton } from "./Skeleton.jsx";

export const StatCard = ({ label, value, loading, accent = "brass" }) => (
  <div className="glass-panel rounded-premium-lg p-5">
    <p className="font-mono text-[11px] uppercase tracking-widest text-ash mb-2">{label}</p>
    {loading ? (
      <Skeleton className="h-8 w-16" />
    ) : (
      <p className={`font-display text-3xl font-semibold leading-none ${accent === "brass" ? "text-brass-dark" : "text-signal-dark"}`}>
        {value}
      </p>
    )}
  </div>
);
