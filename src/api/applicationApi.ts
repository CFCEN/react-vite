import type { AxiosRequestConfig } from 'axios';
import client, { ApiRequestError } from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  ApplicationItem,
  ApplicationStatus,
  ApplicationStatusInfo,
  ApplicationStartResult,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@/types/application';
import { gateRuntimeFields } from '@/types/application';

const silent = { silent: true } as AxiosRequestConfig;

/** Skip batch until this timestamp (ms) after a known failure — re-probe later */
let batchUnavailableUntil = 0;
const BATCH_RETRY_MS = 60_000;

function unknownStatus(id: number): ApplicationStatusInfo {
  return {
    id,
    pid: null,
    commandName: '',
    status: 'UNKNOWN',
    startedAt: null,
    uptime: '',
  };
}

async function fetchStatusOne(id: number): Promise<ApplicationStatusInfo> {
  try {
    const res = await client.get<any, ApiResponse<ApplicationStatusInfo>>(
      `/api/applications/${id}/status`,
      silent,
    );
    return gateRuntimeFields(res.data);
  } catch {
    return unknownStatus(id);
  }
}

async function fetchStatusFallback(ids: number[]): Promise<ApplicationStatusInfo[]> {
  return Promise.all(ids.map((id) => fetchStatusOne(id)));
}

/**
 * Fetch all application statuses.
 * Primary: GET /api/applications/status (batch).
 * Fallback: per-id GET /api/applications/:id/status when batch 404/fails.
 * Pages should only call this — never N+1 themselves.
 */
async function listStatus(ids: number[]): Promise<ApplicationStatusInfo[]> {
  if (ids.length === 0) return [];

  const now = Date.now();
  if (now < batchUnavailableUntil) {
    return fetchStatusFallback(ids);
  }

  try {
    const res = await client.get<
      any,
      { data: { items?: ApplicationStatusInfo[] } | ApplicationStatusInfo[] }
    >('/api/applications/status', silent);
    const payload = res.data;
    const rawItems = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : null;

    if (!rawItems) {
      throw new Error('Unexpected batch status payload');
    }

    batchUnavailableUntil = 0;
    return rawItems.map((item) => gateRuntimeFields(item));
  } catch (err) {
    // Current backend routes `/status` as `/:id` → BAD_REQUEST; treat as unavailable
    const code = err instanceof ApiRequestError ? err.code : '';
    const status = err instanceof ApiRequestError ? err.status : undefined;
    if (
      status === 404 ||
      status === 400 ||
      code === 'NOT_FOUND' ||
      code === 'BAD_REQUEST'
    ) {
      batchUnavailableUntil = now + BATCH_RETRY_MS;
    }
    return fetchStatusFallback(ids);
  }
}

export const applicationApi = {
  list: () =>
    client.get<any, ApiListResponse<ApplicationItem>>('/api/applications'),

  getById: (id: number, opts?: { silent?: boolean }) =>
    client.get<any, ApiResponse<ApplicationItem>>(
      `/api/applications/${id}`,
      opts?.silent ? silent : undefined,
    ),

  create: (data: CreateApplicationRequest) =>
    client.post<any, ApiResponse<ApplicationItem>>('/api/applications', data),

  update: (id: number, data: UpdateApplicationRequest) =>
    client.put<any, ApiResponse<ApplicationItem>>(`/api/applications/${id}`, data),

  delete: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/applications/${id}`),

  start: (id: number, commandName?: string) =>
    client.post<any, ApiResponse<ApplicationStartResult>>(
      `/api/applications/${id}/start`,
      undefined,
      { params: commandName ? { command: commandName } : {} },
    ),

  stop: (id: number) =>
    client.post<any, ApiResponse<{ status: string }>>(`/api/applications/${id}/stop`),

  restart: (id: number, commandName?: string) =>
    client.post<any, ApiResponse<ApplicationStartResult>>(
      `/api/applications/${id}/restart`,
      undefined,
      { params: commandName ? { command: commandName } : {} },
    ),

  status: async (
    id: number,
    opts?: { silent?: boolean },
  ): Promise<ApiResponse<ApplicationStatusInfo>> => {
    const res = await client.get<any, ApiResponse<ApplicationStatusInfo>>(
      `/api/applications/${id}/status`,
      opts?.silent ? silent : undefined,
    );
    return { data: gateRuntimeFields(res.data) };
  },

  /** Batch status with N+1 fallback. Prefer this for list polling. */
  listStatus,

  /** Convenience: list apps then attach gated runtime status */
  listWithStatus: async (): Promise<{
    items: ApplicationItem[];
    total: number;
    statuses: Record<number, ApplicationStatusInfo>;
  }> => {
    const listRes = await applicationApi.list();
    const items = listRes.data.items;
    const statusList = await listStatus(items.map((i) => i.id));
    const statuses: Record<number, ApplicationStatusInfo> = {};
    for (const s of statusList) {
      statuses[s.id] = s;
    }
    for (const item of items) {
      if (!statuses[item.id]) {
        statuses[item.id] = unknownStatus(item.id);
      }
    }
    return { items, total: listRes.data.total, statuses };
  },
};

export type { ApplicationStatus };
