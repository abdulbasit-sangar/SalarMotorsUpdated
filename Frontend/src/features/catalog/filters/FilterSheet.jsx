import { useEffect } from "react";
import clsx from "clsx";
import { useEscapeKey } from "../../../shared/hooks/useEscapeKey.js";
import { CloseIcon } from "../../../shared/components/icons.jsx";

export const FilterSheet = ({
  open,
  onClose,
  title = "Filter Vehicles",
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
        "fixed inset-0 z-[90] grid place-items-center",
        "px-3 py-4 sm:px-5 sm:py-6 lg:px-6",
        "transition-opacity duration-300",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-hidden={!open}
    >
      {/* BACKDROP */}
      <div
        className="
          absolute
          inset-0
          bg-graphite-950/65
          backdrop-blur-sm
          transition-opacity
          duration-300
        "
        onClick={onClose}
        aria-hidden="true"
      />

      {/* FILTER CARD */}
      <div
        className={clsx(
          `
            relative
            z-10
            flex
            w-full
            max-w-[460px]
            max-h-[calc(100dvh-2rem)]
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-card
            bg-white
            shadow-[0_24px_80px_rgba(0,0,0,0.3)]
            transition-all
            duration-300
            ease-[cubic-bezier(0.22,1,0.36,1)]
          `,
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-[0.98] opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <SheetHeader
          title={title}
          description={description}
          onClose={onClose}
        />

        {/* FILTER CONTENT */}
        <div
          className="
            min-h-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            px-4
            py-4
            sm:px-5
            sm:py-5
            lg:px-6
            lg:py-5
          "
        >
          {/* 
            FILTER LAYOUT

            First fields:
            ┌──────────────────────────────┐
            │          INPUT 1             │
            └──────────────────────────────┘

            ┌──────────────────────────────┐
            │          INPUT 2             │
            └──────────────────────────────┘

            ┌──────────────────────────────┐
            │          INPUT 3             │
            └──────────────────────────────┘

            Final two:
            ┌──────────────┐ ┌──────────────┐
            │    INPUT     │ │    INPUT     │
            └──────────────┘ └──────────────┘
          */}
          <div
            className="
              grid
              w-full
              grid-cols-1
              gap-4
            "
          >
            {children}
          </div>
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
      items-center
      justify-between
      gap-4
      border-b
      border-card
      bg-white
      px-4
      py-3.5
      sm:px-5
      sm:py-4
      lg:px-6
    "
  >
    <div className="min-w-0">
      <h2
        className="
          font-display
          text-lg
          font-bold
          leading-tight
          text-bone
          sm:text-xl
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-1
            max-w-sm
            text-xs
            leading-5
            text-ash
            sm:text-sm
          "
        >
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
        h-9
        w-9
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        border-card
        bg-white
        text-ash
        transition-all
        duration-200
        hover:border-brass/40
        hover:bg-brass/10
        hover:text-bone
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-brass/40
        sm:h-10
        sm:w-10
      "
    >
      <CloseIcon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
    </button>
  </header>
);