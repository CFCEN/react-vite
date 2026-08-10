import client from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  ConfigFileItem,
  ConfigFileDetail,
  CreateConfigRequest,
  UpdateConfigRequest,
} from '@/types/config';

export const configApi = {
  list: () =>
    client.get<any, ApiListResponse<ConfigFileItem>>('/api/config-files'),

  getById: (id: number, options?: { silent?: boolean }) =>
    client.get<any, ApiResponse<ConfigFileDetail>>(`/api/config-files/${id}`, {
      ...(options?.silent ? { silent: true } : {}),
    } as Parameters<typeof client.get>[1]),

  create: (data: CreateConfigRequest) =>
    client.post<any, ApiResponse<ConfigFileItem>>('/api/config-files', data),

  update: (id: number, data: UpdateConfigRequest) =>
    client.put<any, ApiResponse<ConfigFileItem>>(`/api/config-files/${id}`, data),

  delete: (id: number) =>
    client.delete<any, ApiResponse<null>>(`/api/config-files/${id}`),
};
