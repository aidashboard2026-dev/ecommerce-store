import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook to wrap an async action handler and prevent duplicate calls while a request is in flight.
 * Uses a synchronous useRef boolean lock to immediately discard rapid double/triple clicks
 * before React state updates re-render the DOM.
 *
 * @param {Function} asyncFn The async function to execute.
 * @returns {Array} [wrappedExecute, isLoading]
 */
export default function useSingleAsyncAction(asyncFn) {
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const execute = useCallback(async (...args) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      return await asyncFn(...args);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [asyncFn]);

  return [execute, loading];
}
