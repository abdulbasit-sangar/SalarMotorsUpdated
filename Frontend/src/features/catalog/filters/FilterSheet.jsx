import { useEffect } from "react";
import clsx from "clsx";
import { useEscapeKey } from "../../../shared/hooks/useEscapeKey.js";
import { CloseIcon } from "../../../shared/components/icons.jsx";

/**
 * Premium filter surface: a full-height bottom sheet on mobile (drag-handle
 * affordance, scrollable body, sticky-safe close) and a right-side floating
 * glass drawer on desktop/tablet. One shared component so Browse and the
 * dedicated Filter page don't each carry their own modal markup.
 *
 * Pure presentation — open/close state and filter logic live in the caller.
 */
export const FilterSheet = ({ open, onClose, title = "Refine Results", description, children }) => {
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[70] transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-graphite/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Mobile: bottom sheet */}
      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 max-h-[88vh] flex flex-col rounded-t-[28px] glass-panel-strong shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden",
          open ? "translate-y-0" : "translate-y-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <span className="h-1.5 w-10 rounded-full bg-graphite/15" aria-hidden="true" />
        </div>
        <SheetHeader title={title} description={description} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
      </div>

      {/* Desktop/tablet: right-side floating glass drawer */}
      <div
        className={clsx(
          "hidden md:flex absolute right-0 top-0 h-full w-full max-w-md flex-col glass-panel-strong border-l shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <SheetHeader title={title} description={description} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 pb-8">{children}</div>
      </div>
    </div>
  );
};

const SheetHeader = ({ title, description, onClose }) => (
  <div className="flex items-start justify-between gap-4 border-b border-card px-5 md:px-6 pb-4 pt-1 md:pt-6 shrink-0">
    <div>
      <h2 className="font-display text-xl font-semibold text-bone">{title}</h2>
      {description && <p className="text-ash text-sm mt-1">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ash transition-colors hover:bg-graphite-100 hover:text-bone"
    >
      <CloseIcon className="h-[18px] w-[18px]" />
    </button>
  </div>
);
