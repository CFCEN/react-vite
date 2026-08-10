import type { ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import './index.less';

export interface ErrorStateProps {
  /** Error object or message string */
  error?: Error | string | null;
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryText?: string;
  extra?: ReactNode;
  className?: string;
}

const { Text, Paragraph } = Typography;

/**
 * Error state with retry.
 *
 * @example
 * <ErrorState error={query.error} onRetry={() => query.refetch()} />
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title = 'Something went wrong',
  description,
  onRetry,
  retryText = 'Retry',
  extra,
  className,
}) => {
  const message =
    description ??
    (typeof error === 'string'
      ? error
      : error?.message || 'An unexpected error occurred.');

  return (
    <div className={`ldw-error-state${className ? ` ${className}` : ''}`}>
      <Result
        icon={<WarningOutlined className="ldw-error-icon" />}
        title={title}
        subTitle={
          <Paragraph className="ldw-error-msg">
            <Text type="secondary">{message}</Text>
          </Paragraph>
        }
        extra={
          <div className="ldw-error-actions">
            {onRetry && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={onRetry}
                className="ldw-clickable"
              >
                {retryText}
              </Button>
            )}
            {extra}
          </div>
        }
      />
    </div>
  );
};

export default ErrorState;
