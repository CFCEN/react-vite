/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
};

/**
 * 格式化时间差为可读文本
 */
export const formatTimeAgo = (dateStr: string): string => {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US');
};

/**
 * 格式化日期时间（绝对时间）
 */
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/** Alias — absolute datetime for TimeText / tooltips */
export const formatDate = formatDateTime;

/**
 * 获取索引状态标签与颜色
 */
export const getIndexStatusInfo = (
  status: string
): { label: string; color: string } => {
  const map: Record<string, { label: string; color: string }> = {
    INDEXED: { label: 'Indexed', color: 'success' },
    READY: { label: 'Indexed', color: 'success' },
    NOT_INDEXED: { label: 'Not indexed', color: 'default' },
    PENDING: { label: 'Pending', color: 'default' },
    INDEXING: { label: 'Indexing', color: 'processing' },
    FAILED: { label: 'Failed', color: 'error' },
    STALE: { label: 'Stale', color: 'warning' },
    OUTDATED: { label: 'Outdated', color: 'warning' },
  };
  return map[status] || { label: status, color: 'default' };
};

/**
 * Application process status label + color (English UI)
 */
export const getApplicationStatusInfo = (
  status: string
): { label: string; color: string } => {
  const map: Record<string, { label: string; color: string }> = {
    STOPPED: { label: 'Stopped', color: 'default' },
    STARTING: { label: 'Starting', color: 'processing' },
    RUNNING: { label: 'Running', color: 'success' },
    STOPPING: { label: 'Stopping', color: 'warning' },
    FAILED: { label: 'Failed', color: 'error' },
    ERROR: { label: 'Error', color: 'error' },
    UNKNOWN: { label: 'Unknown', color: 'default' },
  };
  return map[status] || { label: status, color: 'default' };
};

/**
 * Git working-tree status label + color (English UI)
 * Keys cover both Title Case (legacy) and UPPER_SNAKE (API enrich).
 */
export const getGitStatusInfo = (
  status: string
): { label: string; color: string } => {
  const map: Record<string, { label: string; color: string }> = {
    Clean: { label: 'Clean', color: 'success' },
    CLEAN: { label: 'Clean', color: 'success' },
    Modified: { label: 'Modified', color: 'warning' },
    MODIFIED: { label: 'Modified', color: 'warning' },
    Untracked: { label: 'Untracked', color: 'processing' },
    UNTRACKED: { label: 'Untracked', color: 'processing' },
    Ahead: { label: 'Ahead', color: 'processing' },
    AHEAD: { label: 'Ahead', color: 'processing' },
    Behind: { label: 'Behind', color: 'warning' },
    BEHIND: { label: 'Behind', color: 'warning' },
    DIVERGED: { label: 'Diverged', color: 'error' },
    CONFLICT: { label: 'Conflict', color: 'error' },
    UNKNOWN: { label: 'Unknown', color: 'default' },
  };
  return map[status] || { label: status, color: 'default' };
};
