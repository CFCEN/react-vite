import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getMessage } from '@/utils/antdApp';

export const API_BASE_URL = 'http://127.0.0.1:9527';

/**
 * Makes `{ silent: true }` a first-class request option so callers can opt out
 * of the global error toast (feature-probing an endpoint, background polling)
 * without casting the config.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean;
  }
}

/** Known backend error codes → user-facing hint (English, matches page copy) */
const ERROR_HINTS: Record<string, string> = {
  BAD_REQUEST: 'Invalid request',
  NOT_FOUND: 'Resource not found',
  INTERNAL: 'Internal server error',
  FILE_NOT_FOUND: 'File not found',
  FILE_NOT_READABLE: 'File is not readable',
  APPLICATION_NOT_FOUND: 'Application not found',
  APPLICATION_ALREADY_RUNNING: 'Application is already running',
  APPLICATION_NOT_RUNNING: 'Application is not running',
  APPLICATION_START_FAILED: 'Failed to start application',
  APPLICATION_STOP_FAILED: 'Failed to stop application',
  INVALID_COMMAND: 'Invalid command',
  GIT_PROJECT_NOT_FOUND: 'Git project not found',
  GIT_SCAN_FAILED: 'Git scan failed',
  GROUP_NOT_FOUND: 'Group not found',
  CONTEXT_NOT_FOUND: 'Context not found',
};

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiRequestError extends Error {
  code: string;
  status?: number;
  raw?: unknown;

  constructor(code: string, message: string, status?: number, raw?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.raw = raw;
  }
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Ensure /api prefix for relative paths that forget it
  if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    // Backend envelope: { data: T } — return data layer so callers skip .data
    return response.data;
  },
  (error: AxiosError<{ error?: ApiErrorBody }>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Opt-out: caller can set { silent: true } via config
    const silent = (error.config as InternalAxiosRequestConfig & { silent?: boolean })?.silent;

    const response = error.response;
    const body = response?.data?.error;

    if (body?.code || body?.message) {
      const code = body.code || 'UNKNOWN';
      const msg = body.message || ERROR_HINTS[code] || `Request failed [${code}]`;
      if (!silent) {
        if (response?.status && response.status >= 500) {
          getMessage().error(msg);
        } else if (response?.status === 404) {
          getMessage().warning(msg);
        } else {
          getMessage().error(msg);
        }
      }
      return Promise.reject(new ApiRequestError(code, msg, response?.status, body));
    }

    if (error.code === 'ECONNABORTED') {
      if (!silent) getMessage().error('Request timed out. Is the backend running on :9527?');
      return Promise.reject(new ApiRequestError('TIMEOUT', 'Request timed out', undefined, error));
    }

    if (!response) {
      if (!silent) {
        getMessage().error(`Network error — cannot reach backend (${API_BASE_URL})`);
      }
      return Promise.reject(
        new ApiRequestError('NETWORK', 'Network error', undefined, error),
      );
    }

    const fallback = `Request failed: ${error.message}`;
    if (!silent) getMessage().error(fallback);
    return Promise.reject(
      new ApiRequestError('HTTP', fallback, response.status, error),
    );
  },
);

export default client;
