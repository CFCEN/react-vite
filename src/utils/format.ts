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

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

/**
 * 获取应用状态的中文标签和颜色
 */
export const getApplicationStatusInfo = (
  status: string
): { label: string; color: string } => {
  const map: Record<string, { label: string; color: string }> = {
    STOPPED: { label: '已停止', color: 'default' },
    STARTING: { label: '启动中', color: 'processing' },
    RUNNING: { label: '运行中', color: 'success' },
    STOPPING: { label: '停止中', color: 'warning' },
    FAILED: { label: '失败', color: 'error' },
    UNKNOWN: { label: '未知', color: 'default' },
  };
  return map[status] || { label: status, color: 'default' };
};

/**
 * 获取 Git 状态的中文标签和颜色
 */
export const getGitStatusInfo = (
  status: string
): { label: string; color: string } => {
  const map: Record<string, { label: string; color: string }> = {
    Clean: { label: '干净', color: 'success' },
    Modified: { label: '已修改', color: 'warning' },
    Untracked: { label: '未跟踪', color: 'processing' },
    Ahead: { label: '领先远程', color: 'processing' },
    Behind: { label: '落后远程', color: 'warning' },
    UNKNOWN: { label: '未知', color: 'default' },
  };
  return map[status] || { label: status, color: 'default' };
};
