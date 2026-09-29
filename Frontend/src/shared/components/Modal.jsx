import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons.jsx";

/**
 * Modal — minimal accessible dialog shell (backdrop click + Escape to
 * close, scroll lock while open). No existing modal component in this
 * project, so this is intentionally generic — reusable anywhere a modal is
 * needed, not just for Edit Features.
 */
export const Modal = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-graphite-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg max-h-[85vh] max-h-[85dvh] overflow-y-auto rounded-premium-lg bg-card border border-card shadow-card p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-card">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-card-muted hover:bg-graphite-800 hover:text-card transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};
