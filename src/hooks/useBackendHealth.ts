import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { usePolling } from './usePolling';

export interface UseBackendHealthOptions {
  /** Poll interval ms (default 15000) */
  interval?: number;
  /** Enable polling (default true) */
  enabled?: boolean;
}

export type BackendHealthStatus = 'online' | 'offline' | 'checking';

export interface UseBackendHealthResult {
  status: BackendHealthStatus;
  online: boolean;
  isFetching: boolean;
  lastCheckedAt: number | null;
  error: Error | null;
  refresh: () => void;
}

/**
 * Backend health probe via GET /api/workspace (no dedicated /health endpoint).
 *
 * @example
 * const { status, online, refresh } = useBackendHealth();
 * <StatusDot status={online ? 'running' : 'error'} />
 */
export function useBackendHealth(
  options: UseBackendHealthOptions = {},
): UseBackendHealthResult {
  const { interval = 15_000, enabled = true } = options;
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:9527/api/workspace', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastCheckedAt(Date.now());
      return res.json();
    },
    enabled,
    retry: 0,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  usePolling(refresh, { interval, enabled: enabled && !query.isFetching, immediate: false });

  const status: BackendHealthStatus = useMemo(() => {
    if (query.isLoading && !query.data && !query.isError) return 'checking';
    if (query.isSuccess) return 'online';
    if (query.isError) return 'offline';
    return query.data ? 'online' : 'checking';
  }, [query.isLoading, query.isSuccess, query.isError, query.data]);

  return {
    status,
    online: status === 'online',
    isFetching: query.isFetching,
    lastCheckedAt,
    error: query.error,
    refresh,
  };
}

export default useBackendHealth;
