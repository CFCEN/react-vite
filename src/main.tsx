import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { useEffect } from 'react';
import routes from './router/routes';
import { getThemeConfig, applyDocumentTheme } from './theme';
import { initUITheme, useUIStore } from './stores/uiStore';
import { setAntdAppApis, getMessage } from './utils/antdApp';
import { ApiRequestError } from './api/client';
import './index.css';

// Apply theme before first paint
initUITheme();

function isClientError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return typeof error.status === 'number' && error.status >= 400 && error.status < 500;
  }
  const status = (error as { response?: { status?: number } })?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Skip if query opted out via meta.silent
      if (query.meta?.silent) return;
      // client.ts already toasts HTTP errors; only toast unexpected ones
      if (error instanceof ApiRequestError) return;
      getMessage().error(error instanceof Error ? error.message : 'Request failed');
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      if (error instanceof ApiRequestError) return;
      getMessage().error(error instanceof Error ? error.message : 'Action failed');
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isClientError(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: false,
    },
  },
});

/** Bridges App.useApp() → axios / QueryCache */
function AntdAppBridge({ children }: { children: React.ReactNode }) {
  const { message, notification } = App.useApp();

  useEffect(() => {
    setAntdAppApis(message, notification);
  }, [message, notification]);

  return children;
}

function ThemedApp() {
  const themeMode = useUIStore((s) => s.theme);

  useEffect(() => {
    applyDocumentTheme(themeMode);
  }, [themeMode]);

  return (
    <ConfigProvider
      theme={getThemeConfig(themeMode)}
      componentSize="middle"
      // Page titles are English — keep antd locale English to avoid mixed UI
    >
      <App>
        <AntdAppBridge>
          <RouterProvider router={routes} />
        </AntdAppBridge>
      </App>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ThemedApp />
  </QueryClientProvider>,
);
