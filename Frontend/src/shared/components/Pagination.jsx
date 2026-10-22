import clsx from "clsx";
import { useTranslation } from "react-i18next";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons.jsx";

const buildPageList = (current, total) => {
  if (total <= 7) {
    return Array.from(
      { length: total },
      (_, i) => i + 1,
    );
  }

  const pages = new Set([
    1,
    total,
    current,
    current - 1,
    current + 1,
  ]);

  const sorted = [...pages]
    .filter(
      (p) => p >= 1 && p <= total,
    )
    .sort((a, b) => a - b);

  const result = [];
  let prev = 0;

  for (const p of sorted) {
    if (prev && p - prev > 1) {
      result.push("…");
    }

    result.push(p);
    prev = p;
  }

  return result;
};

export const Pagination = ({
  pagination,
  onPageChange,
}) => {
  const { t } = useTranslation();
  if (
    !pagination ||
    pagination.totalPages <= 1
  ) {
    return null;
  }

  const {
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = pagination;

  const pages = buildPageList(
    page,
    totalPages,
  );

  return (
    <nav
      className="flex flex-col items-center gap-4"
      role="navigation"
      aria-label={t("pagination.label")}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            onPageChange(page - 1)
          }
          disabled={!hasPrevPage}
          aria-label={t("pagination.previous")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-card bg-white/70 text-ash shadow-sm backdrop-blur-sm transition-all hover:border-brass/50 hover:bg-white hover:text-brass-dark active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="flex h-10 w-8 items-center justify-center text-sm text-ash"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() =>
                onPageChange(p)
              }
              aria-current={
                p === page
                  ? "page"
                  : undefined
              }
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-mono transition-all duration-200",
                p === page
                  ? "bg-brass font-semibold text-graphite-950 shadow-sm"
                  : "border border-transparent text-ash hover:border-brass/40 hover:bg-white/70 hover:text-brass-dark",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() =>
            onPageChange(page + 1)
          }
          disabled={!hasNextPage}
          aria-label={t("pagination.next")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-card bg-white/70 text-ash shadow-sm backdrop-blur-sm transition-all hover:border-brass/50 hover:bg-white hover:text-brass-dark active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-ash">
        {t("pagination.pageOf", { page, total: totalPages })}
      </p>
    </nav>
  );
};