import type { ReactNode } from 'react';
import { Button, Empty, Typography } from 'antd';
import {
  InboxOutlined,
  FolderOpenOutlined,
  FileSearchOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import './index.less';

export type EmptyStatePreset = 'default' | 'search' | 'folder' | 'api';

export interface EmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Primary CTA */
  action?: {
    text: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Secondary link/button */
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  preset?: EmptyStatePreset;
  className?: string;
}

const PRESET_ICONS: Record<EmptyStatePreset, ReactNode> = {
  default: <InboxOutlined />,
  search: <FileSearchOutlined />,
  folder: <FolderOpenOutlined />,
  api: <ApiOutlined />,
};

const { Text, Title } = Typography;

/**
 * Empty state with icon + copy + primary action (no emoji).
 *
 * @example
 * <EmptyState
 *   preset="folder"
 *   title="No applications"
 *   description="Create your first local app to get started."
 *   action={{ text: 'New Application', onClick: () => navigate('/applications/new') }}
 * />
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data',
  description,
  action,
  secondaryAction,
  icon,
  preset = 'default',
  className,
}) => {
  return (
    <div className={`ldw-empty-state${className ? ` ${className}` : ''}`}>
      <Empty
        image={
          <div className="ldw-empty-icon" aria-hidden>
            {icon ?? PRESET_ICONS[preset]}
          </div>
        }
        imageStyle={{ height: 64 }}
        description={
          <div className="ldw-empty-copy">
            <Title level={5} className="ldw-empty-title">
              {title}
            </Title>
            {description && (
              <Text type="secondary" className="ldw-empty-desc">
                {description}
              </Text>
            )}
          </div>
        }
      >
        {(action || secondaryAction) && (
          <div className="ldw-empty-actions">
            {action && (
              <Button
                type="primary"
                icon={action.icon}
                onClick={action.onClick}
                className="ldw-clickable"
              >
                {action.text}
              </Button>
            )}
            {secondaryAction && (
              <Button type="link" onClick={secondaryAction.onClick} className="ldw-clickable">
                {secondaryAction.text}
              </Button>
            )}
          </div>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;
