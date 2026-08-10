import { Tag, Tooltip } from 'antd';
import {
  getApplicationStatusInfo,
  getGitStatusInfo,
  getIndexStatusInfo,
} from '@/utils/format';
import './index.less';

export type StatusKind = 'process' | 'git' | 'index' | 'custom';

export type ProcessStatus =
  | 'RUNNING'
  | 'STOPPED'
  | 'STARTING'
  | 'STOPPING'
  | 'FAILED'
  | 'UNKNOWN'
  | string;

export interface StatusTagProps {
  /** Raw status string */
  status: string;
  /** Semantic mapping family */
  kind?: StatusKind;
  /** Override label */
  label?: string;
  /** Override antd Tag color */
  color?: string;
  /** Show as filled tag (default true) */
  bordered?: boolean;
  className?: string;
}

function resolveStatus(
  status: string,
  kind: StatusKind,
): { label: string; color: string } {
  if (kind === 'process') return getApplicationStatusInfo(status);
  if (kind === 'git') return getGitStatusInfo(status);
  if (kind === 'index') return getIndexStatusInfo(status);
  return { label: status, color: 'default' };
}

/**
 * Unified status tag — process / git / index semantic colors.
 *
 * @example
 * <StatusTag status="RUNNING" kind="process" />
 * <StatusTag status="Clean" kind="git" />
 * <StatusTag status="NOT_INDEXED" kind="index" />
 */
export const StatusTag: React.FC<StatusTagProps> = ({
  status,
  kind = 'process',
  label,
  color,
  bordered = true,
  className,
}) => {
  const info = resolveStatus(status, kind);
  return (
    <Tag
      color={color ?? info.color}
      bordered={bordered}
      className={`ldw-status-tag${className ? ` ${className}` : ''}`}
    >
      {label ?? info.label}
    </Tag>
  );
};

export interface StatusDotProps {
  /** Semantic status for color */
  status?: 'running' | 'stopped' | 'error' | 'starting' | 'warning' | 'online' | 'offline' | 'checking';
  /** Custom color override */
  color?: string;
  /** Optional label next to dot */
  label?: string;
  /** Tooltip */
  title?: string;
  size?: number;
  pulse?: boolean;
  className?: string;
}

const DOT_COLOR: Record<string, string> = {
  running: 'var(--ldw-color-success)',
  online: 'var(--ldw-color-success)',
  stopped: 'var(--ldw-text-tertiary)',
  offline: 'var(--ldw-color-error)',
  error: 'var(--ldw-color-error)',
  starting: 'var(--ldw-color-info)',
  checking: 'var(--ldw-color-warning)',
  warning: 'var(--ldw-color-warning)',
};

/**
 * Compact status indicator (header health light, process dots).
 *
 * @example
 * <StatusDot status="online" label="Backend" pulse />
 */
export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'stopped',
  color,
  label,
  title,
  size = 8,
  pulse = false,
  className,
}) => {
  const resolved = color ?? DOT_COLOR[status] ?? 'var(--ldw-text-tertiary)';
  const node = (
    <span className={`ldw-status-dot-wrap${className ? ` ${className}` : ''}`}>
      <span
        className={`ldw-status-dot${pulse ? ' ldw-status-dot--pulse' : ''}`}
        style={{
          width: size,
          height: size,
          backgroundColor: resolved,
          boxShadow: `0 0 0 2px color-mix(in srgb, ${resolved} 25%, transparent)`,
        }}
        aria-hidden
      />
      {label && <span className="ldw-status-dot-label">{label}</span>}
    </span>
  );

  return title ? <Tooltip title={title}>{node}</Tooltip> : node;
};

export default StatusTag;
