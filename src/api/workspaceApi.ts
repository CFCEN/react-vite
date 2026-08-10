import client from './client';
import type { ApiResponse } from '@/types/api';
import type { WorkspaceOverview } from '@/types/workspace';

export const workspaceApi = {
  overview: () =>
    client.get<any, ApiResponse<WorkspaceOverview>>('/api/workspace'),
};
