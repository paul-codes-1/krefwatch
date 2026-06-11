import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Load async data tied to a string key (election date, candidate slug, ...).
 * The loader itself should be cached at module level (see lib/api.ts), so
 * re-mounting with a previously seen key resolves instantly.
 */
export function useData<T>(load: () => Promise<T>, key: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    load().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load data';
          setState({ data: null, loading: false, error: message });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key encodes the loader's identity
  }, [key]);

  return state;
}
