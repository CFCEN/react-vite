import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, AUTOMATION_TOKEN } from '@/api/client';
import type {
  ClaudeAutomationSocketMessage,
  ClaudeAutomationSocketStatus,
} from '@/types/claudeAutomation';

interface Options {
  enabled?: boolean;
  onMessage?: (message: ClaudeAutomationSocketMessage) => void;
  onOpen?: () => void;
  onResync?: () => void;
  adapterId?: string;
}

const MAX_RECONNECT_DELAY = 30_000;

function socketUrl(adapterId: string | undefined, sessionId: string): string {
  const url = new URL('/api/claude-automation/ws', API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('sessionId', sessionId);
  if (adapterId) url.searchParams.set('adapterId', adapterId);
  if (AUTOMATION_TOKEN) url.searchParams.set('token', AUTOMATION_TOKEN);
  return url.toString();
}

export function useClaudeAutomationSocket(
  sessionId: string | undefined,
  { enabled = true, onMessage, onOpen, onResync, adapterId }: Options = {},
) {
  const [status, setStatus] = useState<ClaudeAutomationSocketStatus>('disconnected');
  const callbackRef = useRef(onMessage);
  const connectRef = useRef<() => void>(() => undefined);
  const socketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<number | undefined>(undefined);
  const retriesRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    window.clearTimeout(retryTimerRef.current);
    socketRef.current?.close();
    connectRef.current();
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) {
      setStatus('disconnected');
      return;
    }

    activeRef.current = true;

    const scheduleReconnect = () => {
      if (!activeRef.current) return;
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      const delay = Math.min(1000 * 2 ** retriesRef.current, MAX_RECONNECT_DELAY);
      retriesRef.current += 1;
      setStatus('reconnecting');
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(
        () => connectRef.current(),
        delay + Math.random() * Math.min(1000, delay / 4),
      );
    };

    const connect = () => {
      if (!activeRef.current || document.visibilityState === 'hidden') return;
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }

      window.clearTimeout(retryTimerRef.current);
      socketRef.current?.close();
      setStatus(retriesRef.current ? 'reconnecting' : 'connecting');

      const url = socketUrl(adapterId, sessionId);
      console.info('[claude-automation] websocket connecting', { sessionId, adapterId, url: url.replace(/([?&]token=)[^&]+/, '$1<redacted>') });
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        retriesRef.current = 0;
        setStatus('connected');
        console.info('[claude-automation] websocket connected', { sessionId, adapterId });
        onOpen?.();
        onResync?.();
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ClaudeAutomationSocketMessage;
          console.info('[claude-automation] websocket message', { sessionId, adapterId, type: message.type, eventId: message.event?.id, messageSessionId: message.sessionId });
          callbackRef.current?.(message);
        } catch (error) {
          console.warn('[claude-automation] invalid websocket frame', error);
        }
      };
      socket.onerror = (error) => {
        console.warn('[claude-automation] websocket error', { sessionId, adapterId, error });
        socket.close();
      };
      socket.onclose = (event) => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        console.warn('[claude-automation] websocket closed', { sessionId, adapterId, code: event.code, reason: event.reason });
        scheduleReconnect();
      };
    };

    connectRef.current = connect;
    const onOnline = () => {
      retriesRef.current = 0;
      connect();
    };
    const onOffline = () => {
      window.clearTimeout(retryTimerRef.current);
      socketRef.current?.close();
      setStatus('offline');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !socketRef.current) connect();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    connect();

    return () => {
      activeRef.current = false;
      window.clearTimeout(retryTimerRef.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [adapterId, enabled, onOpen, onResync, sessionId]);

  return { status, reconnect };
}

export default useClaudeAutomationSocket;
