import client from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  LogGroup,
  LogFileItem,
  LogContent,
  CreateLogGroupRequest,
  CreateLogFileRequest,
} from '@/types/log';

export const logApi = {
  // --- 日志分组 ---
  listGroups: () =>
    client.get<any, ApiListResponse<LogGroup>>('/api/log-groups'),

  createGroup: (data: CreateLogGroupRequest) =>
    client.post<any, ApiResponse<LogGroup>>('/api/log-groups', data),

  updateGroup: (id: number, data: Partial<CreateLogGroupRequest>) =>
    client.put<any, ApiResponse<LogGroup>>(`/api/log-groups/${id}`, data),

  deleteGroup: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/log-groups/${id}`),

  // --- 日志文件 ---
  listFiles: () =>
    client.get<any, ApiListResponse<LogFileItem>>('/api/log-files'),

  getFileById: (id: number) =>
    client.get<any, ApiResponse<LogFileItem>>(`/api/log-files/${id}`),

  createFile: (data: CreateLogFileRequest) =>
    client.post<any, ApiResponse<LogFileItem>>('/api/log-files', data),

  updateFile: (id: number, data: Partial<CreateLogFileRequest>) =>
    client.put<any, ApiResponse<LogFileItem>>(`/api/log-files/${id}`, data),

  deleteFile: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/log-files/${id}`),

  getContent: (id: number, params?: { tail?: number }) =>
    client.get<any, ApiResponse<LogContent>>(`/api/log-files/${id}/content`, { params }),
};
