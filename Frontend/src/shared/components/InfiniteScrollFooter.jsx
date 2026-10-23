import { useTranslation } from "react-i18next";
import { Spinner } from "./Spinner.jsx";

/**
 * Footer for an infinite-scrolling list: the observed sentinel, a compact
 * loading indicator, an error + Retry (existing cars stay visible), and a
 * quiet end-of-results message.
 */
export const InfiniteScrollFooter = ({
  hasMore,
  loadingMore,
  loadMoreError,
  onRetry,
  sentinelRef,
}) => {
  const { t } = useTranslation("catalog");

  if (loadMoreError) {
    return (
      <div
        role="alert"
        className="mt-8 flex flex-col items-center gap-3 text-center text-sm text-ash"
      >
        <p>{t("infinite.loadMoreError")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center rounded-full bg-brass px-5 text-sm font-semibold text-graphite-950 shadow-sm transition-colors hover:bg-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
        >
          {t("infinite.retry")}
        </button>
      </div>
    );
  }

  if (hasMore) {
    return (
      <div
        ref={sentinelRef}
        className="mt-8 flex min-h-10 items-center justify-center"
        aria-live="polite"
      >
        {loadingMore && (
          <span className="inline-flex items-center gap-2 text-sm text-ash">
            <Spinner size={16} />
            {t("infinite.loadingMore")}
          </span>
        )}
      </div>
    );
  }

  return (
    <p role="status" className="mt-10 text-center text-sm text-ash">
      {t("infinite.endOfResults")}
    </p>
  );
};
