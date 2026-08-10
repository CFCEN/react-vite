import type { ReactNode } from 'react';
import { Button, Popconfirm } from 'antd';
import type { ButtonProps, PopconfirmProps } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

export interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Confirm title */
  confirmTitle?: ReactNode;
  /** Confirm description */
  confirmDescription?: ReactNode;
  /** Confirm button text */
  okText?: string;
  cancelText?: string;
  /** Danger confirm (default true for destructive ops) */
  confirmDanger?: boolean;
  /** Allows mutateAsync() which resolves to a non-void value */
  onConfirm: () => void | Promise<unknown>;
  onCancel?: () => void;
  /** Popconfirm placement */
  placement?: PopconfirmProps['placement'];
  children?: ReactNode;
}

/**
 * Destructive action button with Popconfirm.
 *
 * @example
 * <ConfirmButton
 *   danger
 *   confirmTitle="Delete this application?"
 *   confirmDescription="This cannot be undone."
 *   onConfirm={() => deleteMutation.mutate(id)}
 * >
 *   Delete
 * </ConfirmButton>
 */
const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  confirmTitle = 'Are you sure?',
  confirmDescription,
  okText = 'Confirm',
  cancelText = 'Cancel',
  confirmDanger = true,
  onConfirm,
  onCancel,
  placement = 'topRight',
  children,
  ...buttonProps
}) => {
  return (
    <Popconfirm
      title={confirmTitle}
      description={confirmDescription}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ danger: confirmDanger }}
      icon={<ExclamationCircleOutlined style={{ color: 'var(--ldw-color-warning)' }} />}
      onConfirm={onConfirm}
      onCancel={onCancel}
      placement={placement}
    >
      <Button className="ldw-clickable" {...buttonProps}>
        {children}
      </Button>
    </Popconfirm>
  );
};

export default ConfirmButton;
