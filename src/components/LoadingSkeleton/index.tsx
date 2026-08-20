import { Card, Skeleton, Space } from 'antd';
import './index.less';

export type LoadingSkeletonVariant = 'table' | 'cards' | 'detail';

export interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant;
  /** Rows for table variant */
  rows?: number;
  /** Cards count for cards variant */
  cards?: number;
  className?: string;
}

/**
 * Loading skeletons — table / cards / detail variants.
 *
 * @example
 * <LoadingSkeleton variant="table" rows={6} />
 * <Suspense fallback={<LoadingSkeleton variant="detail" />}>...</Suspense>
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'detail',
  rows = 6,
  cards = 4,
  className,
}) => {
  if (variant === 'table') {
    return (
      <div className={`ldw-skeleton ldw-skeleton--table${className ? ` ${className}` : ''}`}>
        <div className="ldw-skeleton-toolbar">
          <Skeleton.Input active style={{ width: 220 }} size="small" />
          <Skeleton.Button active size="small" />
        </div>
        <Skeleton active paragraph={{ rows }} title={false} />
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`ldw-skeleton ldw-skeleton--cards${className ? ` ${className}` : ''}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i} className="ldw-skeleton-card" size="small">
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`ldw-skeleton ldw-skeleton--detail${className ? ` ${className}` : ''}`}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Skeleton.Input active style={{ width: 240 }} />
        <Skeleton active paragraph={{ rows: 3 }} />
        <Skeleton active paragraph={{ rows: 4 }} title={false} />
      </Space>
    </div>
  );
};

export default LoadingSkeleton;
