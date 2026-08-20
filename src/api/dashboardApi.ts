import type { AxiosRequestConfig } from 'axios';
import client, { ApiRequestError } from './client';
import { applicationApi } from './applicationApi';
import { gitApi } from './gitApi';
import { logApi } from './logApi';
import { configApi } from './configApi';
import type { ApiResponse } from '@/types/api';
import type { CommandDef } from '@/types/application';

type SilentRequestConfig = AxiosRequestConfig & { silent?: boolean };

/** Recent app row on Dashboard (aggregate or fallback) */
export interface DashboardRecentApp {
  id: number;
  name: string;
  /** workingDirectory when available */
  path?: string;
  /** Runtime status; omit/undefined = unknown (never fake STOPPED) */
  status?: string | null;
  commands?: CommandDef[];
  updatedAt?: string;
}

/** Recent git project row */
export interface DashboardRecentProject {
  id: number;
  name: string;
  path: string;
  status?: string | null;
  branch?: string;
  updatedAt?: string;
}

/**
 * Dashboard aggregate payload.
 * `runningCount === null` means the metric is unavailable — UI must hide it (not show 0).
 */
export interface DashboardSummary {
  applicationCount: number;
  runningCount: number | null;
  gitProjectCount: number;
  logFileCount: number;
  configCount: number;
  recentApps: DashboardRecentApp[];
  recentProjects: DashboardRecentProject[];
  /** Whether data came from /api/dashboard/summary or client-side assembly */
  source: 'aggregate' | 'fallback';
}

interface AggregatePayload {
  applicationCount: number;
  runningCount?: number | null;
  gitProjectCount: number;
  logFileCount: number;
  configCount: number;
  recentApps?: DashboardRecentApp[];
  recentProjects?: DashboardRecentProject[];
}

function isNotFound(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 404;
}

function byUpdatedAtDesc<T extends { updatedAt?: string }>(a: T, b: T): number {
  const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
  const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
  return tb - ta;
}

/**
 * Derive runningCount. If every status is UNKNOWN (probes failed), return null
 * so the UI hides the metric instead of showing a misleading 0.
 */
function deriveRunningCount(
  statuses: Array<{ status: string }>,
): number | null {
  if (statuses.length === 0) return null;
  const known = statuses.filter((s) => s.status !== 'UNKNOWN');
  if (known.length === 0) return null;
  return statuses.filter((s) => s.status === 'RUNNING').length;
}

/** Parallel multi-request assembly when aggregate endpoint is missing */
async function assembleFallbackSummary(): Promise<DashboardSummary> {
  const [appsRes, projectsRes, logsRes, configsRes] = await Promise.all([
    applicationApi.list(),
    gitApi.listProjects(),
    logApi.listFiles(),
    configApi.list(),
  ]);

  const apps = appsRes.data?.items ?? [];
  const projects = projectsRes.data?.items ?? [];

  // Prefer batch status helper (falls back to per-id internally)
  const statusList = await applicationApi.listStatus(apps.map((a) => a.id));
  const statusMap = new Map(statusList.map((s) => [s.id, s]));
  const runningCount = deriveRunningCount(statusList);

  const recentApps: DashboardRecentApp[] = [...apps]
    .sort(byUpdatedAtDesc)
    .slice(0, 5)
    .map((app) => {
      const st = statusMap.get(app.id);
      const raw = st?.status;
      return {
        id: app.id,
        name: app.name,
        path: app.workingDirectory,
        // UNKNOWN from failed probe → null so UI shows "Unknown", never fake STOPPED
        status: !raw || raw === 'UNKNOWN' ? null : raw,
        commands: app.commands,
        updatedAt: app.updatedAt,
      };
    });

  const recentProjects: DashboardRecentProject[] = [...projects]
    .sort(byUpdatedAtDesc)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      status: null,
      branch: p.branch,
      updatedAt: p.updatedAt,
    }));

  return {
    applicationCount: appsRes.data?.total ?? apps.length,
    runningCount,
    gitProjectCount: projectsRes.data?.total ?? projects.length,
    logFileCount: logsRes.data?.total ?? logsRes.data?.items?.length ?? 0,
    configCount: configsRes.data?.total ?? configsRes.data?.items?.length ?? 0,
    recentApps,
    recentProjects,
    source: 'fallback',
  };
}

function normalizeAggregate(raw: AggregatePayload): DashboardSummary {
  const running =
    raw.runningCount === undefined || raw.runningCount === null
      ? null
      : raw.runningCount;

  return {
    applicationCount: raw.applicationCount ?? 0,
    runningCount: running,
    gitProjectCount: raw.gitProjectCount ?? 0,
    logFileCount: raw.logFileCount ?? 0,
    configCount: raw.configCount ?? 0,
    recentApps: (raw.recentApps ?? []).map((a) => ({
      ...a,
      // Preserve null/undefined — do not coerce missing status to STOPPED
      status: a.status ?? null,
    })),
    recentProjects: (raw.recentProjects ?? []).map((p) => ({
      ...p,
      status: p.status ?? null,
    })),
    source: 'aggregate',
  };
}

/**
 * Dashboard summary — prefers GET /api/dashboard/summary;
 * on 404 falls back to parallel list + status probes via applicationApi.listStatus.
 * Page layer should not branch on source.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await client.get<any, ApiResponse<AggregatePayload>>(
      '/api/dashboard/summary',
      { silent: true } as SilentRequestConfig,
    );
    return normalizeAggregate(res.data);
  } catch (err) {
    if (isNotFound(err)) {
      return assembleFallbackSummary();
    }
    // Other errors (network, 5xx): still try fallback so Dashboard stays usable
    try {
      return assembleFallbackSummary();
    } catch {
      throw err;
    }
  }
}

export const dashboardApi = {
  getSummary: getDashboardSummary,
};
