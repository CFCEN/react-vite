/** 应用状态 */
export type ApplicationStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'FAILED'
  | 'UNKNOWN';

/** 命令定义（支持多命令） */
export interface CommandDef {
  name: string;
  command: string;
}

/** 应用列表项 */
export interface ApplicationItem {
  id: number;
  name: string;
  description: string;
  commands: CommandDef[];
  workingDirectory: string;
  environment: string; // JSON string
  autoStart: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 应用状态详情 */
export interface ApplicationStatusInfo {
  id: number;
  pid: number | null;
  commandName?: string;
  status: ApplicationStatus;
  startedAt: string | null;
  uptime: string;
}

/** 应用启动结果 */
export interface ApplicationStartResult {
  applicationId: number;
  pid: number;
  commandName?: string;
  status: ApplicationStatus;
  startedAt: string;
}

/** 创建应用请求 */
export interface CreateApplicationRequest {
  name: string;
  commands: CommandDef[];
  description?: string;
  workingDirectory?: string;
  environment?: string;
  autoStart?: boolean;
}

/** 修改应用请求 (所有字段可选) */
export interface UpdateApplicationRequest {
  name?: string;
  commands?: CommandDef[];
  description?: string;
  workingDirectory?: string;
  environment?: string;
  autoStart?: boolean;
  enabled?: boolean;
}
