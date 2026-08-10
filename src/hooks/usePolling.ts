import { useEffect, useRef } from 'react';

/**
 * 通用轮询 hook
 * @param callback 轮询回调
 * @param interval 间隔 (ms)，默认 5000
 * @param enabled 是否启用
 */
export const usePolling = (
  callback: () => void,
  interval: number = 5000,
  enabled: boolean = true
) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // 立即执行一次
    savedCallback.current();

    const id = setInterval(() => {
      savedCallback.current();
    }, interval);

    return () => clearInterval(id);
  }, [interval, enabled]);
};
