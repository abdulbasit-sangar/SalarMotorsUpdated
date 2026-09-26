/**
 * SoldRibbon — premium diagonal "SOLD" banner for the top-left corner of a
 * vehicle card/image. Renders nothing when `sold` is false so call sites
 * can use it unconditionally.
 *
 * Must be placed inside a `relative` + `overflow-hidden` container (the
 * image wrapper in CarCard.jsx already is).
 */
export const SoldRibbon = ({ sold }) => {
  if (!sold) return null;

  return (
    <div
      className="pointer-events-none absolute -left-11 top-5 z-20 w-[150px] -rotate-45"
      aria-hidden="true"
    >
      <div className="flex items-center justify-center bg-gradient-to-b from-danger to-[#9d1f1f] py-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-1 ring-white/20">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white">
          Sold
        </span>
      </div>
    </div>
  );
};

/** Screen-reader-only label, used alongside the visual ribbon. */
export const SoldSrLabel = ({ sold }) =>
  sold ? <span className="sr-only">This vehicle has been sold</span> : null;
