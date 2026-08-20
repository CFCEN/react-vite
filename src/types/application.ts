/** Process lifecycle status from backend */
export type ApplicationStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'FAILED'
  | 'UNKNOWN';

/** Named command entry (backend has commands[], not a singular `command`) */
export interface CommandDef {
  name: string;
  command: string;
}

/** Application list / detail item — aligned with GET /api/applications */
export interface ApplicationItem {
  id: number;
  name: string;
  description: string;
  commands: CommandDef[];
  workingDirectory: string;
  /** JSON object string, e.g. `{"NODE_ENV":"development"}` */
  environment: string;
  autoStart: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Runtime status from GET /api/applications/:id/status
 * or GET /api/applications/status (batch).
 *
 * Frontend must gate display: when status !== 'RUNNING', treat
 * pid / commandName / startedAt / uptime as absent regardless of payload.
 */
export interface ApplicationStatusInfo {
  id: number;
  pid: number | null;
  commandName?: string;
  status: ApplicationStatus;
  startedAt: string | null;
  /** Present when RUNNING; often omitted when STOPPED */
  uptime?: string;
}

/** Start / restart result */
export interface ApplicationStartResult {
  applicationId: number;
  pid: number;
  commandName?: string;
  status: ApplicationStatus;
  startedAt: string;
}

export interface CreateApplicationRequest {
  name: string;
  commands: CommandDef[];
  description?: string;
  workingDirectory?: string;
  environment?: string;
  autoStart?: boolean;
}

export interface UpdateApplicationRequest {
  name?: string;
  commands?: CommandDef[];
  description?: string;
  workingDirectory?: string;
  environment?: string;
  autoStart?: boolean;
  enabled?: boolean;
}

/** English labels for process status (StatusTag default still uses Chinese utils) */
export const PROCESS_STATUS_LABEL: Record<ApplicationStatus, string> = {
  STOPPED: 'Stopped',
  STARTING: 'Starting',
  RUNNING: 'Running',
  STOPPING: 'Stopping',
  FAILED: 'Failed',
  UNKNOWN: 'Unknown',
};

/** Normalize runtime fields for UI — ignore stale pid/etc when not RUNNING */
export function gateRuntimeFields(info: ApplicationStatusInfo): ApplicationStatusInfo {
  if (info.status === 'RUNNING') {
    return {
      ...info,
      uptime: info.uptime ?? '',
    };
  }
  return {
    ...info,
    pid: null,
    commandName: '',
    startedAt: null,
    uptime: '',
  };
}
