import { useMemo, useState, type ReactNode } from 'react';
import { Button, Checkbox, Dropdown, Input, Space, Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import {
  ColumnHeightOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { useUIStore } from '@/stores/uiStore';
import './index.less';

export interface DataTableColumn<T> {
  key: string;
  title: ReactNode;
  dataIndex?: keyof T | string;
  width?: number | string;
  ellipsis?: boolean;
  fixed?: 'left' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  render?: (value: unknown, record: T, index: number) => ReactNode;
  defaultHidden?: boolean;
  locked?: boolean;
}

export interface DataTableProps<T extends object> {
  dataSource: T[];
  columns: DataTableColumn<T>[];
  rowKey: keyof T | ((record: T) => string);
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { text: string; onClick: () => void };
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  onRefresh?: () => void;
  toolbarExtra?: ReactNode;
  showColumnSettings?: boolean;
  showDensityToggle?: boolean;
  sticky?: boolean | { offsetHeader?: number };
  pagination?: TableProps<T>['pagination'];
  onChange?: TableProps<T>['onChange'];
  size?: TableProps<T>['size'];
  scroll?: TableProps<T>['scroll'];
  className?: string;
  rowClassName?: TableProps<T>['rowClassName'];
  /** Forwarded to antd Table — batch assign / bulk delete etc. */
  rowSelection?: TableProps<T>['rowSelection'];
}

/**
 * Ant Design Table wrapper — pagination, sticky header, density, empty/error/loading.
 *
 * @example
 * <DataTable
 *   rowKey="id"
 *   loading={table.loading}
 *   dataSource={table.data}
 *   columns={columns}
 *   pagination={table.pagination}
 *   searchable
 *   onSearch={table.setSearch}
 *   onRefresh={table.refresh}
 * />
 */
function DataTable<T extends object>({
  dataSource,
  columns,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'No data',
  emptyDescription,
  emptyAction,
  searchable = false,
  searchPlaceholder = 'Search…',
  searchValue,
  onSearch,
  onRefresh,
  toolbarExtra,
  showColumnSettings = true,
  showDensityToggle = true,
  sticky = true,
  pagination,
  onChange,
  size: sizeProp,
  scroll,
  className,
  rowClassName,
  rowSelection,
}: DataTableProps<T>) {
  const storeDensity = useUIStore((s) => s.tableDensity);
  const setTableDensity = useUIStore((s) => s.setTableDensity);
  const size: TableProps<T>['size'] =
    sizeProp ?? (storeDensity === 'default' ? 'large' : storeDensity);

  const [localSearch, setLocalSearch] = useState('');
  const search = searchValue ?? localSearch;

  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() =>
    columns.filter((c) => c.defaultHidden).map((c) => c.key),
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenKeys.includes(c.key)),
    [columns, hiddenKeys],
  );

  const antdColumns: TableProps<T>['columns'] = visibleColumns.map((col) => ({
    key: col.key,
    title: col.title,
    dataIndex: col.dataIndex as string | undefined,
    width: col.width,
    ellipsis: col.ellipsis,
    fixed: col.fixed,
    sorter: col.sorter,
    render: col.render,
  }));

  const columnMenuItems = columns
    .filter((c) => !c.locked)
    .map((c) => ({
      key: c.key,
      label: (
        <Checkbox
          checked={!hiddenKeys.includes(c.key)}
          onChange={(e) => {
            setHiddenKeys((prev) =>
              e.target.checked ? prev.filter((k) => k !== c.key) : [...prev, c.key],
            );
          }}
        >
          {typeof c.title === 'string' ? c.title : c.key}
        </Checkbox>
      ),
    }));

  if (error) {
    return <ErrorState error={error} onRetry={onRetry ?? onRefresh} />;
  }

  const showToolbar =
    searchable || onRefresh || toolbarExtra || showColumnSettings || showDensityToggle;

  return (
    <div className={`ldw-data-table${className ? ` ${className}` : ''}`}>
      {showToolbar && (
        <div className="ldw-data-table-toolbar">
          <div className="ldw-data-table-toolbar-left">
            {searchable && (
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  if (searchValue === undefined) setLocalSearch(v);
                  onSearch?.(v);
                }}
                style={{ width: 240 }}
              />
            )}
            {toolbarExtra}
          </div>
          <Space size={4} className="ldw-data-table-toolbar-right">
            {onRefresh && (
              <Tooltip title="Refresh">
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  loading={loading}
                  className="ldw-clickable"
                  aria-label="Refresh"
                />
              </Tooltip>
            )}
            {showDensityToggle && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'large',
                      label: 'Comfortable',
                      onClick: () => setTableDensity('default'),
                    },
                    {
                      key: 'middle',
                      label: 'Medium',
                      onClick: () => setTableDensity('middle'),
                    },
                    {
                      key: 'small',
                      label: 'Compact',
                      onClick: () => setTableDensity('small'),
                    },
                  ],
                  selectedKeys: [
                    storeDensity === 'default'
                      ? 'large'
                      : storeDensity === 'middle'
                        ? 'middle'
                        : 'small',
                  ],
                }}
                trigger={['click']}
              >
                <Tooltip title="Density">
                  <Button
                    type="text"
                    icon={<ColumnHeightOutlined />}
                    className="ldw-clickable"
                    aria-label="Density"
                  />
                </Tooltip>
              </Dropdown>
            )}
            {showColumnSettings && columnMenuItems.length > 0 && (
              <Dropdown menu={{ items: columnMenuItems }} trigger={['click']}>
                <Tooltip title="Columns">
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    className="ldw-clickable"
                    aria-label="Columns"
                  />
                </Tooltip>
              </Dropdown>
            )}
          </Space>
        </div>
      )}

      <Table<T>
        size={size}
        rowKey={rowKey as string | ((record: T) => string)}
        columns={antdColumns}
        dataSource={dataSource}
        loading={loading}
        pagination={
          pagination === false
            ? false
            : {
                showSizeChanger: true,
                showTotal: (t) => `${t} items`,
                ...(typeof pagination === 'object' ? pagination : {}),
              }
        }
        onChange={onChange}
        sticky={sticky}
        scroll={scroll ?? { x: 'max-content' }}
        rowClassName={rowClassName}
        rowSelection={rowSelection}
        locale={{
          emptyText: (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
              preset={search ? 'search' : 'default'}
            />
          ),
        }}
        className="ldw-data-table-inner"
      />
    </div>
  );
}

export default DataTable;
