import client from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  GitProjectItem,
  GitProjectDetail,
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
} from '@/types/workspace';

export const gitApi = {
  // --- Git 项目 ---
  listProjects: () =>
    client.get<any, ApiListResponse<GitProjectItem>>('/api/git/projects'),

  scan: (data: GitScanRequest) =>
    client.post<any, ApiListResponse<GitScanItem>>('/api/git/projects/scan', data),

  getProjectById: (id: number) =>
    client.get<any, ApiResponse<GitProjectDetail>>(`/api/git/projects/${id}`),

  updateProject: (id: number, data: Record<string, unknown>) =>
    client.put<any, ApiResponse<GitProjectItem>>(`/api/git/projects/${id}`, data),

  deleteProject: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/git/projects/${id}`),

  assignGroup: (id: number, data: AssignGroupRequest) =>
    client.post<any, ApiResponse<GitProjectItem>>(`/api/git/projects/${id}/group`, data),

  batchAssignGroup: (data: BatchAssignGroupRequest) =>
    client.post<any, ApiListResponse<GitProjectItem>>('/api/git/projects/batch/group', data),

  // --- Git 分组 ---
  listGroups: () =>
    client.get<any, ApiListResponse<GitGroup>>('/api/git/groups'),

  getGroupById: (id: number) =>
    client.get<any, ApiResponse<GitGroup>>(`/api/git/groups/${id}`),

  listProjectsByGroup: (groupId: number) =>
    client.get<any, ApiListResponse<GitProjectItem>>(`/api/git/groups/${groupId}/projects`),

  createGroup: (data: { name: string; description?: string; ragPath?: string; indexPath?: string }) =>
    client.post<any, ApiResponse<GitGroup>>('/api/git/groups', data),

  updateGroup: (id: number, data: Record<string, unknown>) =>
    client.put<any, ApiResponse<GitGroup>>(`/api/git/groups/${id}`, data),

  deleteGroup: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/git/groups/${id}`),

  // --- Project Context ---
  listContexts: (groupId: number) =>
    client.get<any, ApiListResponse<ProjectContext>>(`/api/git/groups/${groupId}/contexts`),

  getContext: (groupId: number, contextId: number) =>
    client.get<any, ApiResponse<ProjectContext>>(`/api/git/groups/${groupId}/contexts/${contextId}`),

  createContext: (groupId: number, data: CreateContextRequest) =>
    client.post<any, ApiResponse<ProjectContext>>(`/api/git/groups/${groupId}/contexts`, data),

  updateContext: (groupId: number, contextId: number, data: UpdateContextRequest) =>
    client.put<any, ApiResponse<ProjectContext>>(`/api/git/groups/${groupId}/contexts/${contextId}`, data),

  deleteContext: (groupId: number, contextId: number) =>
    client.delete<any, ApiResponse<null>>(`/api/git/groups/${groupId}/contexts/${contextId}`),

  // --- Context 文档文件 ---
  listContextFiles: (groupId: number, contextId: number, type: 'rag' | 'index') =>
    client.get<any, ApiListResponse<ContextFile>>(`/api/git/groups/${groupId}/contexts/${contextId}/files`, { params: { type } }),

  getContextFileContent: (groupId: number, contextId: number, type: 'rag' | 'index', file: string) =>
    client.get<any, ApiResponse<ContextFileContent>>(`/api/git/groups/${groupId}/contexts/${contextId}/files/content`, { params: { type, file } }),

  createContextFile: (groupId: number, contextId: number, data: CreateContextFileRequest) =>
    client.post<any, ApiResponse<ContextFileContent>>(`/api/git/groups/${groupId}/contexts/${contextId}/files`, data),

  updateContextFile: (groupId: number, contextId: number, data: UpdateContextFileRequest) =>
    client.put<any, ApiResponse<ContextFileContent>>(`/api/git/groups/${groupId}/contexts/${contextId}/files`, data),

  deleteContextFile: (groupId: number, contextId: number, type: 'rag' | 'index', file: string) =>
    client.delete<any, ApiResponse<null>>(`/api/git/groups/${groupId}/contexts/${contextId}/files`, { params: { type, file } }),
};
