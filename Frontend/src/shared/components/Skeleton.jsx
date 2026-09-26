import clsx from "clsx";

export const Skeleton = ({ className }) => (
  <div className={clsx("animate-pulse bg-steel/60 rounded-sm", className)} />
);

export const CarCardSkeleton = () => (
  <div className="overflow-hidden rounded-premium-lg bg-card border border-card shadow-card">
    <Skeleton className="w-full aspect-[4/3] rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-5 w-2/5" />
    </div>
  </div>
);
