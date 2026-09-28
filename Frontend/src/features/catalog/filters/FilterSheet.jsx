import { useEffect } from "react";
import clsx from "clsx";
import { useEscapeKey } from "../../../shared/hooks/useEscapeKey.js";
import { CloseIcon } from "../../../shared/components/icons.jsx";

export const FilterSheet = ({
  open,
  onClose,
  title = "Refine Results",
  description,
  children,
}) => {
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
        "fixed inset-0 z-[90] transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-hidden={!open}
    >
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-graphite/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* MOBILE BOTTOM SHEET */}
      <div
        className={clsx(
          `
            absolute
            inset-x-0
            bottom-0
            flex
            max-h-[92dvh]
            flex-col
            overflow-hidden
            rounded-t-[32px]
            border
            border-b-0
            border-card
            bg-white
            shadow-[0_-20px_60px_rgba(0,0,0,0.25)]
            transition-transform
            duration-300
            ease-[cubic-bezier(0.22,1,0.36,1)]
            md:hidden
          `,
          open ? "translate-y-0" : "translate-y-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {/* DRAG HANDLE */}
        <div className="flex shrink-0 justify-center pb-1 pt-3.5" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-graphite/20" />
        </div>

        <SheetHeader
          title={title}
          description={description}
          onClose={onClose}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
          {children}
        </div>
      </div>

      {/* DESKTOP / TABLET DRAWER */}
      <div
        className={clsx(
          `
            absolute
            right-0
            top-0
            hidden
            h-full
            w-full
            max-w-[460px]
            flex-col
            overflow-hidden
            border-l
            border-card
            bg-white
            shadow-[-20px_0_60px_rgba(0,0,0,0.2)]
            transition-transform
            duration-300
            ease-[cubic-bezier(0.22,1,0.36,1)]
            md:flex
          `,
          open ? "translate-x-0" : "translate-x-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <SheetHeader
          title={title}
          description={description}
          onClose={onClose}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-10 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const SheetHeader = ({ title, description, onClose }) => (
  <header
    className="
      flex
      shrink-0
      items-start
      justify-between
      gap-4
      border-b
      border-card
      bg-white/95
      px-5
      pb-4
      pt-4
      backdrop-blur-xl
      md:px-6
      md:pb-5
      md:pt-6
    "
  >
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-brass-dark">
          Filter Controls
        </span>
      </div>

      <h2 className="font-display text-xl font-bold leading-tight text-bone md:text-2xl">
        {title}
      </h2>

      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-ash md:text-sm">
          {description}
        </p>
      )}
    </div>

    <button
      type="button"
      onClick={onClose}
      aria-label="Close filters"
      className="
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        border-card
        bg-white
        text-ash
        shadow-sm
        transition-all
        duration-200
        hover:border-brass/40
        hover:bg-brass/10
        hover:text-bone
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-brass/40
      "
    >
      <CloseIcon className="h-[17px] w-[17px]" />
    </button>
  </header>
);