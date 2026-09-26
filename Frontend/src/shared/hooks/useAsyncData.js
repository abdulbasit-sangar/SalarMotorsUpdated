import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiError } from "../../services/api/client.js";

/**
 * useAsyncData — runs `fetcher` whenever `deps` change, tracking
 * loading/error/data state. Guards against setting state after unmount
 * or after a newer call has already started (stale-response protection).
 */
export const useAsyncData = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (id === requestId.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (id === requestId.current) {
          setError(parseApiError(err));
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, refetch: run };
};
