import client, { ApiRequestError } from './client';
import type { AxiosRequestConfig } from 'axios';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  GitProjectListItem,
  GitProjectDetail,
  GitProjectStatusItem,
  GitGroup,
  GitScanItem,
  GitScanRequest,
  AssignGroupRequest,
  BatchAssignGroupRequest,
} from '@/types/git';
import type {
  ProjectContext,
  CreateContextRequest,
  UpdateContextRequest,
  ContextFile,
  ContextFileContent,
  CreateContextFileRequest,
  UpdateContextFileRequest,
  WorkspaceOverview,
} from '@/types/workspace';

type RequestConfig = AxiosRequestConfig & { silent?: boolean };

/** Cached probe: null = unknown, true/false = known */
let statusBatchSupported: boolean | null = null;

function isNotFound(err: unknown): boolean {
  return err instanceof ApiRequestError && (err.status === 404 || err.code === 'NOT_FOUND');
}

/**
 * Probe POST /api/git/projects/status once.
 * Returns false on 404; treats other errors (e.g. empty body 400) as available.
 */
export async function isProjectStatusBatchAvailable(): Promise<boolean> {
  if (statusBatchSupported !== null) return statusBatchSupported;
  try {
    await client.post<any, ApiResponse<{ items: GitProjectStatusItem[] }>>(
      '/api/git/projects/status',
      { ids: [] },
      { silent: true } as RequestConfig,
    );
    statusBatchSupported = true;
  } catch (err) {
    if (isNotFound(err)) {
      statusBatchSupported = false;
    } else {
      // Endpoint exists but rejected empty ids / validation — treat as available
      statusBatchSupported = true;
    }
  }
  return statusBatchSupported;
}

/** Reset capability cache (useful after backend restart during migration) */
export function resetGitApiCapabilityCache(): void {
  statusBatchSupported = null;
}

async function fetchGroupNameMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const res = await client.get<any, ApiListResponse<GitGroup>>('/api/git/groups', {
      silent: true,
    } as RequestConfig);
    for (const g of res.data?.items || []) {
      map.set(g.id, g.name);
    }
  } catch {
    // ignore — leave groupName empty
  }
  return map;
}

async function fetchContextCountMap(): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  try {
    const res = await client.get<any, ApiResponse<WorkspaceOverview>>('/api/workspace', {
      silent: true,
    } as RequestConfig);
    for (const ctx of res.data?.contexts || []) {
      map.set(ctx.groupId, (map.get(ctx.groupId) || 0) + 1);
    }
  } catch {
    // ignore
  }
  return map;
}

/** Join groupName onto list items when backend omits it */
async function enrichProjectsWithGroupName(
  items: GitProjectListItem[],
): Promise<GitProjectListItem[]> {
  const needsJoin = items.some((p) => p.groupId != null && (p.groupName == null || p.groupName === ''));
  if (!needsJoin) return items;
  const nameMap = await fetchGroupNameMap();
  return items.map((p) => {
    if (p.groupId != null && (p.groupName == null || p.groupName === '')) {
      return { ...p, groupName: nameMap.get(p.groupId) ?? null };
    }
    return p;
  });
}

/** Join contextCount onto groups when backend omits it */
async function enrichGroupsWithContextCount(items: GitGroup[]): Promise<GitGroup[]> {
  const needsJoin = items.some((g) => g.contextCount == null);
  if (!needsJoin) return items;
  const countMap = await fetchContextCountMap();
  return items.map((g) => ({
    ...g,
    contextCount: g.contextCount ?? countMap.get(g.id) ?? 0,
  }));
}

/**
 * Batch-fetch git status for project ids.
 * Returns null when the batch endpoint is unavailable (caller should hide status column).
 * Never falls back to N detail requests.
 */
export async function fetchProjectStatuses(
  ids: number[],
): Promise<GitProjectStatusItem[] | null> {
  if (ids.length === 0) return [];
  const available = await isProjectStatusBatchAvailable();
  if (!available) return null;

  try {
    const res = await client.post<any, ApiResponse<{ items: GitProjectStatusItem[] }>>(
      '/api/git/projects/status',
      { ids },
      { silent: true } as RequestConfig,
    );
    return res.data?.items ?? [];
  } catch (err) {
    if (isNotFound(err)) {
      statusBatchSupported = false;
      return null;
    }
    throw err;
  }
}

export const gitApi = {
  // --- Git projects ---

  /**
   * List projects (fast path — no status enrichment).
   * Fills `groupName` via groups join when backend omits it.
   */
  listProjects: async (): Promise<ApiListResponse<GitProjectListItem>> => {
    const res = await client.get<any, ApiListResponse<GitProjectListItem>>('/api/git/projects');
    const items = await enrichProjectsWithGroupName(res.data?.items || []);
    return { data: { items, total: res.data?.total ?? items.length } };
  },

  /**
   * Optional enrich path — only when backend supports `?enrich=status`.
   * Prefer listProjects + fetchProjectStatuses for progressive loading.
   */
  listProjectsEnriched: async (): Promise<ApiListResponse<GitProjectListItem>> => {
    const res = await client.get<any, ApiListResponse<GitProjectListItem>>(
      '/api/git/projects',
      { params: { enrich: 'status' } },
    );
    const items = await enrichProjectsWithGroupName(res.data?.items || []);
    return { data: { items, total: res.data?.total ?? items.length } };
  },

  scan: (data: GitScanRequest) =>
    client.post<any, ApiListResponse<GitScanItem>>('/api/git/projects/scan', data),

  getProjectById: (id: number, config?: RequestConfig) =>
    client.get<any, ApiResponse<GitProjectDetail>>(`/api/git/projects/${id}`, config),

  updateProject: (id: number, data: Record<string, unknown>) =>
    client.put<any, ApiResponse<GitProjectListItem>>(`/api/git/projects/${id}`, data),

  deleteProject: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/git/projects/${id}`),

  assignGroup: (id: number, data: AssignGroupRequest) =>
    client.post<any, ApiResponse<GitProjectListItem>>(`/api/git/projects/${id}/group`, data),

  batchAssignGroup: (data: BatchAssignGroupRequest) =>
    client.post<any, ApiListResponse<GitProjectListItem>>('/api/git/projects/batch/group', data),

  fetchProjectStatuses,

  isProjectStatusBatchAvailable,

  // --- Git groups ---

  listGroups: async (): Promise<ApiListResponse<GitGroup>> => {
    const res = await client.get<any, ApiListResponse<GitGroup>>('/api/git/groups');
    const items = await enrichGroupsWithContextCount(res.data?.items || []);
    return { data: { items, total: res.data?.total ?? items.length } };
  },

  getGroupById: (id: number, config?: RequestConfig) =>
    client.get<any, ApiResponse<GitGroup>>(`/api/git/groups/${id}`, config),

  listProjectsByGroup: async (groupId: number): Promise<ApiListResponse<GitProjectListItem>> => {
    const res = await client.get<any, ApiListResponse<GitProjectListItem>>(
      `/api/git/groups/${groupId}/projects`,
    );
    const items = await enrichProjectsWithGroupName(res.data?.items || []);
    return { data: { items, total: res.data?.total ?? items.length } };
  },

  createGroup: (data: {
    name: string;
    description?: string;
    ragPath?: string;
    indexPath?: string;
  }) => client.post<any, ApiResponse<GitGroup>>('/api/git/groups', data),

  updateGroup: (id: number, data: Record<string, unknown>) =>
    client.put<any, ApiResponse<GitGroup>>(`/api/git/groups/${id}`, data),

  deleteGroup: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/git/groups/${id}`),

  // --- Project Context ---
  listContexts: (groupId: number) =>
    client.get<any, ApiListResponse<ProjectContext>>(
      `/api/git/groups/${groupId}/contexts`,
    ),

  getContext: (groupId: number, contextId: number) =>
    client.get<any, ApiResponse<ProjectContext>>(
      `/api/git/groups/${groupId}/contexts/${contextId}`,
    ),

  createContext: (groupId: number, data: CreateContextRequest) =>
    client.post<any, ApiResponse<ProjectContext>>(
      `/api/git/groups/${groupId}/contexts`,
      data,
    ),

  updateContext: (groupId: number, contextId: number, data: UpdateContextRequest) =>
    client.put<any, ApiResponse<ProjectContext>>(
      `/api/git/groups/${groupId}/contexts/${contextId}`,
      data,
    ),

  deleteContext: (groupId: number, contextId: number) =>
    client.delete<any, ApiResponse<null>>(
      `/api/git/groups/${groupId}/contexts/${contextId}`,
    ),

  // --- Context files ---
  listContextFiles: (groupId: number, contextId: number, type: 'rag' | 'index') =>
    client.get<any, ApiListResponse<ContextFile>>(
      `/api/git/groups/${groupId}/contexts/${contextId}/files`,
      { params: { type } },
    ),

  getContextFileContent: (
    groupId: number,
    contextId: number,
    type: 'rag' | 'index',
    file: string,
  ) =>
    client.get<any, ApiResponse<ContextFileContent>>(
      `/api/git/groups/${groupId}/contexts/${contextId}/files/content`,
      { params: { type, file } },
    ),

  createContextFile: (groupId: number, contextId: number, data: CreateContextFileRequest) =>
    client.post<any, ApiResponse<ContextFileContent>>(
      `/api/git/groups/${groupId}/contexts/${contextId}/files`,
      data,
    ),

  updateContextFile: (groupId: number, contextId: number, data: UpdateContextFileRequest) =>
    client.put<any, ApiResponse<ContextFileContent>>(
      `/api/git/groups/${groupId}/contexts/${contextId}/files`,
      data,
    ),

  deleteContextFile: (
    groupId: number,
    contextId: number,
    type: 'rag' | 'index',
    file: string,
  ) =>
    client.delete<any, ApiResponse<null>>(
      `/api/git/groups/${groupId}/contexts/${contextId}/files`,
      { params: { type, file } },
    ),
};
