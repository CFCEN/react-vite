import { Tooltip, Typography } from 'antd';
import { formatDate, formatTimeAgo } from '@/utils/format';

export interface TimeTextProps {
  /** ISO date string or Date */
  value?: string | Date | null;
  /** Prefer relative time (default true) */
  relative?: boolean;
  /** Fallback when empty */
  empty?: string;
  className?: string;
}

/**
 * Relative time with absolute tooltip.
 *
 * @example
 * <TimeText value={record.updatedAt} />
 */
const TimeText: React.FC<TimeTextProps> = ({
  value,
  relative = true,
  empty = '—',
  className,
}) => {
  if (!value) {
    return (
      <Typography.Text type="secondary" className={className}>
        {empty}
      </Typography.Text>
    );
  }

  const iso = typeof value === 'string' ? value : value.toISOString();
  const absolute = formatDate(iso);
  const display = relative ? formatTimeAgo(iso) : absolute;

  return (
    <Tooltip title={absolute}>
      <Typography.Text className={`ldw-time-text${className ? ` ${className}` : ''}`}>
        {display}
      </Typography.Text>
    </Tooltip>
  );
};

export default TimeText;
