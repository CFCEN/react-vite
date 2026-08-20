/** Git working-tree status (detail / enriched list) */
export type GitStatus =
  | 'Clean'
  | 'Modified'
  | 'Untracked'
  | 'Ahead'
  | 'Behind'
  | 'UNKNOWN'
  | string;

/**
 * Last commit may be a preformatted string (current detail API)
 * or a structured object (future batch status API).
 */
export type GitLastCommit =
  | string
  | {
      hash?: string;
      message?: string;
      author?: string;
      date?: string;
      [key: string]: unknown;
    };

/** Base fields returned by list endpoints (no git-command enrichment) */
export interface GitProjectListItem {
  id: number;
  name: string;
  path: string;
  branch: string;
  remote: string;
  groupId: number | null;
  /** Present when backend joins groups; otherwise filled by gitApi fallback */
  groupName?: string | null;
  ragPath?: string;
  indexPath?: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Optional — only when `?enrich=status` or after batch status fill.
   * List without enrich does not return these.
   */
  status?: GitStatus | null;
  lastCommit?: GitLastCommit | null;
}

/** @deprecated Prefer GitProjectListItem — kept as alias for gradual migration */
export type GitProjectItem = GitProjectListItem;

/** Detail response — always includes computed status / groupName */
export interface GitProjectDetail {
  id: number;
  name: string;
  path: string;
  branch: string;
  remote: string;
  status: GitStatus;
  lastCommit: GitLastCommit | null;
  groupId: number | null;
  groupName: string;
  ragPath: string;
  indexPath: string;
  createdAt: string;
  updatedAt: string;
}

/** Single item from POST /api/git/projects/status */
export interface GitProjectStatusItem {
  id: number;
  status: GitStatus;
  lastCommit?: GitLastCommit | null;
}

/** Scan discovery item */
export interface GitScanItem {
  name: string;
  path: string;
  branch: string;
  remote: string;
}

/** Git group */
export interface GitGroup {
  id: number;
  name: string;
  description: string;
  ragPath: string;
  indexPath: string;
  projectCount: number;
  /** Present when backend counts contexts; otherwise filled by gitApi fallback */
  contextCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GitScanRequest {
  path: string;
  maxDepth?: number;
}

export interface AssignGroupRequest {
  groupId: number;
}

export interface BatchAssignGroupRequest {
  projectIds: number[];
  groupId: number;
}

/** Format lastCommit for display */
export function formatGitLastCommit(commit: GitLastCommit | null | undefined): string {
  if (commit == null || commit === '') return '';
  if (typeof commit === 'string') return commit;
  const hash = commit.hash ? String(commit.hash).slice(0, 7) : '';
  const message = commit.message ? String(commit.message) : '';
  if (hash && message) return `${hash} ${message}`;
  return hash || message || '';
}
