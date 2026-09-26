import clsx from "clsx";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons.jsx";

/**
 * Builds a windowed page list with "…" gaps, e.g. [1, "…", 4, 5, 6, "…", 12]
 */
const buildPageList = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
};

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNextPage, hasPrevPage } = pagination;
  const pages = buildPageList(page, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1.5 flex-wrap"
      role="navigation"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevPage}
        aria-label="Previous page"
        className="w-10 h-10 flex items-center justify-center rounded-full border border-card bg-white/60 text-ash hover:text-brass-dark hover:border-brass/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="w-10 h-10 flex items-center justify-center text-ash text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={clsx(
              "w-10 h-10 flex items-center justify-center rounded-full text-sm font-mono transition-colors",
              p === page
                ? "bg-brass text-graphite-950 font-semibold shadow-sm"
                : "text-ash hover:text-brass-dark border border-transparent hover:border-brass/40 hover:bg-white/60"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        aria-label="Next page"
        className="w-10 h-10 flex items-center justify-center rounded-full border border-card bg-white/60 text-ash hover:text-brass-dark hover:border-brass/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </nav>
  );
};
