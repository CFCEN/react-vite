import type { ReactNode } from 'react';
import { Button, Result, Space, Tabs, Typography } from 'antd';
import type { TabsProps } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import './index.less';

export interface PageContainerProps {
  /** Page title */
  title?: ReactNode;
  /** Secondary description under title */
  subTitle?: ReactNode;
  /** Right-side actions (buttons etc.) */
  extra?: ReactNode;
  /** Override layout breadcrumb (optional) */
  breadcrumb?: ReactNode;
  /** Show skeleton while loading */
  loading?: boolean;
  /** Skeleton variant when loading */
  loadingVariant?: 'table' | 'cards' | 'detail';
  /** Error state — string message or Error */
  error?: Error | string | null;
  /** Retry handler for error state */
  onRetry?: () => void;
  /** Optional tabs under header */
  tabs?: TabsProps;
  /** Sticky footer */
  footer?: ReactNode;
  /** Content padding (default true) */
  contentPadding?: boolean | number;
  /** Max width override (default uses CSS var) */
  maxWidth?: number | string | false;
  children?: ReactNode;
  className?: string;
}

const { Title, Text } = Typography;

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subTitle,
  extra,
  breadcrumb,
  loading = false,
  loadingVariant = 'detail',
  error,
  onRetry,
  tabs,
  footer,
  contentPadding = true,
  maxWidth,
  children,
  className,
}) => {
  const paddingStyle =
    contentPadding === false
      ? { padding: 0 }
      : typeof contentPadding === 'number'
        ? { padding: contentPadding }
        : undefined;

  const maxWidthStyle =
    maxWidth === false
      ? { maxWidth: 'none' }
      : maxWidth !== undefined
        ? { maxWidth }
        : undefined;

  const renderBody = () => {
    if (loading) {
      return <LoadingSkeleton variant={loadingVariant} />;
    }
    if (error) {
      return (
        <ErrorState
          error={error}
          onRetry={onRetry}
        />
      );
    }
    return children;
  };

  return (
    <div className={`page-container${className ? ` ${className}` : ''}`}>
      {(title || extra || breadcrumb || subTitle) && (
        <div className="page-header">
          {breadcrumb && <div className="page-breadcrumb">{breadcrumb}</div>}
          <div className="page-header-main">
            <div className="page-header-titles">
              {title && (
                <Title level={3} className="page-title">
                  {title}
                </Title>
              )}
              {subTitle && (
                <Text type="secondary" className="page-subtitle">
                  {subTitle}
                </Text>
              )}
            </div>
            {extra && <div className="page-extra">{extra}</div>}
          </div>
          {tabs && (
            <div className="page-tabs">
              <Tabs {...tabs} />
            </div>
          )}
        </div>
      )}

      <div
        className="page-content"
        style={{ ...paddingStyle, ...maxWidthStyle }}
      >
        {renderBody()}
      </div>

      {footer && <div className="page-footer">{footer}</div>}
    </div>
  );
};

export default PageContainer;

/** Convenience full-page empty result (legacy pages) */
export function PageEmpty({
  title = 'Nothing here',
  subTitle,
  onRefresh,
}: {
  title?: string;
  subTitle?: string;
  onRefresh?: () => void;
}) {
  return (
    <Result
      status="info"
      title={title}
      subTitle={subTitle}
      extra={
        onRefresh ? (
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Refresh
          </Button>
        ) : undefined
      }
    />
  );
}

export function PageActions({ children }: { children: ReactNode }) {
  return <Space wrap>{children}</Space>;
}
