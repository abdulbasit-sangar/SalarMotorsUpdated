import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiError } from "../../services/api/client.js";

// Cancellation errors never surface as user-facing errors. Covers axios
// cancellations (code "ERR_CANCELED" / name "CanceledError") and native
// AbortError from fetch-based fetchers.
const isCancelError = (error) =>
  !!error &&
  (error.code === "ERR_CANCELED" ||
    error.name === "CanceledError" ||
    error.name === "AbortError");

/**
 * useAsyncData — runs `fetcher` whenever `deps` change, tracking
 * loading/error/data state.
 *
 * Cancellation:
 * - Every run gets its own AbortController; its `signal` is passed to the
 *   fetcher as `fetcher({ signal })`. Fetchers that support cancellation
 *   (e.g. axios via `config.signal`) forward it; fetchers that ignore the
 *   argument keep working unchanged.
 * - Starting a new run (deps change or manual `refetch()`) aborts the
 *   previous request. Unmount aborts the outstanding request via the
 *   effect cleanup.
 * - An aborted request never sets error state and never touches state once
 *   a newer run started; if the aborted request is still the current one,
 *   only its loading flag is cleared.
 *
 * Stale-response protection:
 * - A monotonically increasing request id guards every state update, so a
 *   fetcher that cannot be cancelled still can't overwrite newer data. A
 *   mounted flag guards updates after unmount.
 *
 * Note on the shared cache: fetchers behind the `cached()` API helper share
 * one promise between components — aborting is intentionally a no-op for
 * them (the signal is ignored), and the id/mounted guards perform safe
 * invalidation instead. Physical cancellation only happens when the
 * fetcher itself forwards the signal to the network layer.
 */
export const useAsyncData = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const abortController = useRef(null);
  const mounted = useRef(true);

  const run = useCallback(() => {
    // Cancel the previous request before starting a new one.
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    fetcher({ signal: controller.signal })
      .then((result) => {
        if (!mounted.current || id !== requestId.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted.current || id !== requestId.current) return;
        // A cancelled request is not an error: just release the loading state.
        if (isCancelError(err)) {
          setLoading(false);
          return;
        }
        setError(parseApiError(err));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
      // Unmount or deps change: cancel the outstanding request. The
      // request-id guard above keeps this safe even when the fetcher
      // ignores the signal.
      abortController.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, refetch: run };
};
