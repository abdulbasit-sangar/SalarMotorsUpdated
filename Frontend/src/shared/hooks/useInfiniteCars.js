import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiError } from "../../services/api/client.js";

/**
 * useInfiniteCars — continuous, append-only loading of a paginated listing.
 *
 * `fetchPage(page)` must resolve `{ cars, pagination: { hasNextPage, totalCars } }`
 * (the existing /api/cars/filter and /api/cars/search contract). Pagination is
 * an internal detail: the backend's `hasNextPage` is the only thing that
 * decides whether more results exist.
 *
 * `resetKey` identifies the active query (filters + sort + keyword + category).
 * When it changes, the list, cursor and errors are cleared and any in-flight
 * response from the previous query is ignored (generation guard), so a stale
 * response can never be appended to the new query's list.
 *
 * The returned `sentinelRef` goes on an element placed after the grid. It is
 * observed with a generous rootMargin so the next batch starts before the
 * user reaches the bottom. The observer is re-created after each batch, so a
 * sentinel that is still on screen (short batch / tall screen) keeps loading
 * until the screen is filled or results run out — always one request at a time.
 */

const EMPTY = { cars: [], nextPage: 1, hasMore: true, totalCars: 0 };

export const useInfiniteCars = (
  fetchPage,
  resetKey,
  { rootMargin = "600px 0px" } = {},
) => {
  const [state, setState] = useState(EMPTY);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialError, setInitialError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [sentinel, setSentinel] = useState(null);

  const stateRef = useRef(state); // latest state for async callbacks
  const fetchPageRef = useRef(fetchPage);
  const inFlightRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    fetchPageRef.current = fetchPage;
  });

  const commit = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const request = useCallback(
    async (initial) => {
      if (inFlightRef.current) return;
      const current = stateRef.current;
      if (!initial && !current.hasMore) return;

      const generation = generationRef.current;
      inFlightRef.current = true;
      if (initial) {
        setInitialLoading(true);
        setInitialError(null);
      } else {
        setLoadingMore(true);
        setLoadMoreError(null);
      }

      try {
        const result = await fetchPageRef.current(current.nextPage);
        if (generation !== generationRef.current) return; // stale query

        const incoming = result?.cars ?? [];
        const known = new Set(current.cars.map((car) => car._id));
        commit({
          cars: [...current.cars, ...incoming.filter((c) => !known.has(c._id))],
          nextPage: current.nextPage + 1,
          hasMore: Boolean(result?.pagination?.hasNextPage),
          totalCars: result?.pagination?.totalCars ?? current.totalCars,
        });
      } catch (err) {
        if (generation !== generationRef.current) return;
        // The cursor is untouched, so Retry re-requests exactly the failed
        // batch: nothing duplicated, nothing skipped.
        if (initial) setInitialError(parseApiError(err));
        else setLoadMoreError(parseApiError(err));
      } finally {
        if (generation === generationRef.current) {
          inFlightRef.current = false;
          if (initial) setInitialLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [commit],
  );

  // New query (or first mount): start over from the first batch.
  useEffect(() => {
    generationRef.current += 1;
    inFlightRef.current = false;
    commit(EMPTY);
    setLoadingMore(false);
    setLoadMoreError(null);
    request(true);
  }, [resetKey, commit, request]);

  const loadMore = useCallback(() => request(false), [request]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    request(false);
  }, [request]);

  const retryInitial = useCallback(() => request(true), [request]);

  const canAutoLoad =
    !initialLoading &&
    !initialError &&
    !loadingMore &&
    !loadMoreError &&
    state.hasMore &&
    state.cars.length > 0;

  useEffect(() => {
    if (!sentinel || !canAutoLoad) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      loadMore();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect(); // also cleans up on unmount
  }, [sentinel, canAutoLoad, state.cars.length, loadMore, rootMargin]);

  return {
    cars: state.cars,
    totalCars: state.totalCars,
    hasMore: state.hasMore,
    initialLoading,
    initialError,
    loadingMore,
    loadMoreError,
    sentinelRef: setSentinel,
    retryInitial,
    retryLoadMore,
  };
};
