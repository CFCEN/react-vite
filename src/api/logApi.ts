import client from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  LogGroup,
  LogFileItem,
  LogContent,
  CreateLogGroupRequest,
  CreateLogFileRequest,
} from '@/types/log';

type AxiosSilentConfig = { silent?: boolean };

const fetchFilesRaw = () =>
  client.get<any, ApiListResponse<LogFileItem>>('/api/log-files');

const fetchGroupsRaw = () =>
  client.get<any, ApiListResponse<LogGroup>>('/api/log-groups');

/** Join groupName when backend omits it (graceful degradation). */
async function withGroupNames(items: LogFileItem[]): Promise<LogFileItem[]> {
  const needJoin = items.some(
    (item) => (item.groupName == null || item.groupName === '') && item.groupId != null,
  );
  if (!needJoin) {
    return items.map((item) => ({
      ...item,
      groupName: item.groupName ?? null,
    }));
  }

  try {
    const groupsRes = await fetchGroupsRaw();
    const map = new Map(
      (groupsRes.data?.items ?? []).map((g) => [g.id, g.name] as const),
    );
    return items.map((item) => ({
      ...item,
      groupName:
        item.groupName ||
        (item.groupId != null ? map.get(item.groupId) ?? null : null),
    }));
  } catch {
    return items.map((item) => ({
      ...item,
      groupName: item.groupName ?? null,
    }));
  }
}

/** Compute fileCount when backend omits it (graceful degradation). */
async function withFileCounts(items: LogGroup[]): Promise<LogGroup[]> {
  if (items.every((g) => typeof g.fileCount === 'number')) {
    return items;
  }

  try {
    const filesRes = await fetchFilesRaw();
    const counts = new Map<number, number>();
    for (const file of filesRes.data?.items ?? []) {
      if (file.groupId == null) continue;
      counts.set(file.groupId, (counts.get(file.groupId) ?? 0) + 1);
    }
    return items.map((g) => ({
      ...g,
      fileCount: typeof g.fileCount === 'number' ? g.fileCount : (counts.get(g.id) ?? 0),
    }));
  } catch {
    return items.map((g) => ({
      ...g,
      fileCount: typeof g.fileCount === 'number' ? g.fileCount : 0,
    }));
  }
}

/** Normalize content payload — omit undefined metadata so UI never shows NaN/undefined. */
function normalizeContent(raw: Partial<LogContent> | null | undefined): LogContent {
  const content = typeof raw?.content === 'string' ? raw.content : '';
  const normalized: LogContent = {
    content,
    size: typeof raw?.size === 'number' && Number.isFinite(raw.size) ? raw.size : 0,
    modifiedAt: typeof raw?.modifiedAt === 'string' ? raw.modifiedAt : '',
  };

  if (typeof raw?.totalLines === 'number' && Number.isFinite(raw.totalLines)) {
    normalized.totalLines = raw.totalLines;
  }
  if (typeof raw?.returnedLines === 'number' && Number.isFinite(raw.returnedLines)) {
    normalized.returnedLines = raw.returnedLines;
  } else if (content.length > 0 || content === '') {
    // Fallback: count lines from content when backend omits returnedLines
    const lines = content.length === 0 ? 0 : content.split('\n').length;
    // Trailing newline often creates an empty last segment — match common tail UX
    const adjusted =
      content.endsWith('\n') && lines > 0 ? lines - 1 : lines;
    normalized.returnedLines = adjusted;
  }
  if (typeof raw?.truncated === 'boolean') {
    normalized.truncated = raw.truncated;
  }

  return normalized;
}

export const logApi = {
  // --- Log groups ---
  listGroups: async (): Promise<ApiListResponse<LogGroup>> => {
    const res = await fetchGroupsRaw();
    const items = await withFileCounts(res.data?.items ?? []);
    return {
      data: {
        items,
        total: res.data?.total ?? items.length,
      },
    };
  },

  createGroup: (data: CreateLogGroupRequest) =>
    client.post<any, ApiResponse<LogGroup>>('/api/log-groups', data),

  updateGroup: (id: number, data: Partial<CreateLogGroupRequest>) =>
    client.put<any, ApiResponse<LogGroup>>(`/api/log-groups/${id}`, data),

  deleteGroup: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/log-groups/${id}`),

  // --- Log files ---
  listFiles: async (): Promise<ApiListResponse<LogFileItem>> => {
    const res = await fetchFilesRaw();
    const items = await withGroupNames(res.data?.items ?? []);
    return {
      data: {
        items,
        total: res.data?.total ?? items.length,
      },
    };
  },

  getFileById: async (
    id: number,
    config?: AxiosSilentConfig,
  ): Promise<ApiResponse<LogFileItem>> => {
    const res = await client.get<any, ApiResponse<LogFileItem>>(
      `/api/log-files/${id}`,
      {
        ...(config?.silent ? { silent: true } : {}),
      } as Parameters<typeof client.get>[1],
    );
    const [enriched] = await withGroupNames(res.data ? [res.data] : []);
    return { data: enriched ?? res.data };
  },

  createFile: (data: CreateLogFileRequest) =>
    client.post<any, ApiResponse<LogFileItem>>('/api/log-files', data),

  updateFile: (id: number, data: Partial<CreateLogFileRequest>) =>
    client.put<any, ApiResponse<LogFileItem>>(`/api/log-files/${id}`, data),

  deleteFile: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/log-files/${id}`),

  getContent: async (
    id: number,
    params?: { tail?: number },
    config?: AxiosSilentConfig,
  ) => {
    const res = await client.get<any, ApiResponse<Partial<LogContent>>>(
      `/api/log-files/${id}/content`,
      {
        params,
        ...(config?.silent ? { silent: true } : {}),
      } as Parameters<typeof client.get>[1],
    );
    return { data: normalizeContent(res.data) };
  },
};
