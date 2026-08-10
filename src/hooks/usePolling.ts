import { useEffect, useRef } from 'react';

export interface UsePollingOptions {
  /** Interval in ms (supports dynamic updates) */
  interval?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Run callback immediately when starting (default true) */
  immediate?: boolean;
  /** Pause when document.hidden (default true) */
  pauseWhenHidden?: boolean;
}

/**
 * Polling hook — pauses when tab is hidden, cleans up on unmount, supports dynamic interval.
 *
 * @example
 * usePolling(() => refetch(), { interval: 5000, enabled: isRunning });
 */
export function usePolling(
  callback: () => void,
  intervalOrOptions: number | UsePollingOptions = 5000,
  enabledArg: boolean = true,
): void {
  const options: UsePollingOptions =
    typeof intervalOrOptions === 'number'
      ? { interval: intervalOrOptions, enabled: enabledArg }
      : intervalOrOptions;

  const {
    interval = 5000,
    enabled = true,
    immediate = true,
    pauseWhenHidden = true,
  } = options;

  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let id: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        return;
      }
      savedCallback.current();
    };

    const start = () => {
      if (id) clearInterval(id);
      id = setInterval(tick, interval);
    };

    if (immediate) {
      tick();
    }
    start();

    const onVisibility = () => {
      if (!pauseWhenHidden) return;
      if (!document.hidden) {
        // Resume: fire once then restart interval
        savedCallback.current();
        start();
      } else if (id) {
        clearInterval(id);
        id = undefined;
      }
    };

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      if (id) clearInterval(id);
      if (pauseWhenHidden && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [interval, enabled, immediate, pauseWhenHidden]);
}

export default usePolling;
