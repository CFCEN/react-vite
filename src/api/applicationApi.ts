import client from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  ApplicationItem,
  ApplicationStatusInfo,
  ApplicationStartResult,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@/types/application';

export const applicationApi = {
  list: () =>
    client.get<any, ApiListResponse<ApplicationItem>>('/api/applications'),

  getById: (id: number) =>
    client.get<any, ApiResponse<ApplicationItem>>(`/api/applications/${id}`),

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

  status: (id: number) =>
    client.get<any, ApiResponse<ApplicationStatusInfo>>(`/api/applications/${id}/status`),
};
