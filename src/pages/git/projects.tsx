import './git.less';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ScanOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  gitApi,
  fetchProjectStatuses,
  isProjectStatusBatchAvailable,
} from '@/api/gitApi';
import type { GitProjectListItem, GitGroup } from '@/types/git';
import {
  PageContainer,
  DataTable,
  StatusTag,
  PathText,
  ConfirmButton,
  EmptyState,
} from '@/components';
import type { DataTableColumn } from '@/components';

const { Text } = Typography;

type StatusMap = Record<number, { status: string; loading?: boolean }>;

const GitProjects = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQ = searchParams.get('q') ?? '';

  const [scanPath, setScanPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(5);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectGroupId, setSelectGroupId] = useState<number | undefined>();
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [statusColumnEnabled, setStatusColumnEnabled] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const setSearch = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value.trim()) next.set('q', value);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['gitProjects'],
    queryFn: () => gitApi.listProjects(),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['gitGroups'],
    queryFn: () => gitApi.listGroups(),
  });

  // Stabilize empty fallback — unstable [] would re-fire status batch effect every render
  const items: GitProjectListItem[] = useMemo(
    () => data?.data?.items ?? [],
    [data?.data?.items],
  );
  const groups: GitGroup[] = useMemo(
    () => groupsData?.data?.items ?? [],
    [groupsData?.data?.items],
  );

  const filteredItems = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        (p.branch || '').toLowerCase().includes(q) ||
        (p.groupName || '').toLowerCase().includes(q),
    );
  }, [items, searchQ]);

  /** Progressive status fill — list first, then batch POST */
  useEffect(() => {
    let cancelled = false;
    const ids = items.map((p) => p.id);
    if (ids.length === 0) return;

    // If list already has status (enrich path), use it
    const alreadyEnriched = items.every((p) => p.status != null && p.status !== '');
    if (alreadyEnriched) {
      const map: StatusMap = {};
      for (const p of items) {
        if (p.status) map[p.id] = { status: p.status };
      }
      setStatusMap(map);
      setStatusColumnEnabled(true);
      return;
    }

    (async () => {
      const available = await isProjectStatusBatchAvailable();
      if (cancelled) return;
      if (!available) {
        setStatusColumnEnabled(false);
        setStatusMap({});
        return;
      }
      setStatusColumnEnabled(true);
      setStatusLoading(true);
      // Placeholder skeleton per row
      setStatusMap((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          if (!next[id]?.status) next[id] = { status: '', loading: true };
        }
        return next;
      });
      try {
        const t0 = performance.now();
        const result = await fetchProjectStatuses(ids);
        if (cancelled) return;
        if (result == null) {
          setStatusColumnEnabled(false);
          setStatusMap({});
          return;
        }
        const map: StatusMap = {};
        for (const row of result) {
          map[row.id] = { status: row.status, loading: false };
        }
        // Mark missing as UNKNOWN
        for (const id of ids) {
          if (!map[id]) map[id] = { status: 'UNKNOWN', loading: false };
        }
        setStatusMap(map);
        if (import.meta.env.DEV) {
          console.debug(
            `[git] status batch for ${ids.length} projects: ${Math.round(performance.now() - t0)}ms`,
          );
        }
      } catch {
        if (!cancelled) {
          // Keep column but show UNKNOWN placeholders
          setStatusMap((prev) => {
            const next = { ...prev };
            for (const id of ids) {
              next[id] = { status: 'UNKNOWN', loading: false };
            }
            return next;
          });
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const scanMutation = useMutation({
    mutationFn: () => gitApi.scan({ path: scanPath.trim(), maxDepth }),
    onSuccess: (res) => {
      const found = res.data?.items?.length ?? 0;
      const total = res.data?.total ?? found;
      appMessage.success(
        found > 0
          ? `Scan complete — found ${found} project${found === 1 ? '' : 's'}${total !== found ? ` (total ${total})` : ''}`
          : 'Scan complete — no new projects found',
      );
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gitApi.deleteProject(id),
    onSuccess: () => {
      appMessage.success('Project removed');
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      setSelectedRowKeys([]);
    },
  });

  const assignGroupMutation = useMutation({
    mutationFn: ({ projectIds, groupId }: { projectIds: number[]; groupId: number }) =>
      gitApi.batchAssignGroup({ projectIds, groupId }),
    onSuccess: (_res, variables) => {
      const count = variables.projectIds.length;
      appMessage.success(
        count > 1
          ? `Assigned ${count} projects to group`
          : 'Project assigned to group',
      );
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroupProjects'] });
      setGroupModalOpen(false);
      setSelectedRowKeys([]);
      setSelectGroupId(undefined);
    },
  });

  const handleScan = () => {
    if (!scanPath.trim()) {
      appMessage.warning('Enter a scan path');
      return;
    }
    if (scanMutation.isPending) return;
    scanMutation.mutate();
  };

  const openGroupModal = (keys: number[]) => {
    setSelectedRowKeys(keys);
    setSelectGroupId(undefined);
    setGroupModalOpen(true);
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedRowKeys((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((k) => k !== id),
    );
  };

  const allFilteredIds = filteredItems.map((p) => p.id);
  const allSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedRowKeys.includes(id));
  const someSelected =
    allFilteredIds.some((id) => selectedRowKeys.includes(id)) && !allSelected;

  const columns: DataTableColumn<GitProjectListItem>[] = [
    {
      key: 'select',
      title: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowKeys((prev) => [...new Set([...prev, ...allFilteredIds])]);
            } else {
              setSelectedRowKeys((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
            }
          }}
          aria-label="Select all"
        />
      ),
      width: 48,
      locked: true,
      render: (_: unknown, record) => (
        <Checkbox
          checked={selectedRowKeys.includes(record.id)}
          onChange={(e) => toggleSelect(record.id, e.target.checked)}
          aria-label={`Select ${record.name}`}
        />
      ),
    },
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      locked: true,
      render: (_: unknown, record) => (
        <Link to={`/git/projects/${record.id}`} className="ldw-clickable">
          {record.name}
        </Link>
      ),
    },
    {
      key: 'path',
      title: 'Path',
      dataIndex: 'path',
      ellipsis: true,
      render: (_: unknown, record) => <PathText path={record.path} />,
    },
    {
      key: 'branch',
      title: 'Branch',
      dataIndex: 'branch',
      width: 140,
      render: (b: unknown) => (b ? <Tag>{String(b)}</Tag> : <Tag>—</Tag>),
    },
    ...(statusColumnEnabled
      ? [
          {
            key: 'status',
            title: (
              <Tooltip title={statusLoading ? 'Loading git status…' : 'Working tree status'}>
                <span>Status</span>
              </Tooltip>
            ),
            width: 120,
            render: (_: unknown, record: GitProjectListItem) => {
              const entry = statusMap[record.id];
              if (!entry || entry.loading || !entry.status) {
                return <Skeleton.Button active size="small" style={{ width: 64, height: 22 }} />;
              }
              return <StatusTag status={entry.status} kind="git" />;
            },
          } satisfies DataTableColumn<GitProjectListItem>,
        ]
      : [
          {
            key: 'status',
            title: (
              <Tooltip title="Batch status API unavailable (POST /api/git/projects/status). Status will appear when the backend ships it.">
                <span>Status</span>
              </Tooltip>
            ),
            width: 100,
            render: () => (
              <Text type="secondary" style={{ fontSize: 12 }}>
                N/A
              </Text>
            ),
          } satisfies DataTableColumn<GitProjectListItem>,
        ]),
    {
      key: 'groupName',
      title: 'Group',
      dataIndex: 'groupName',
      width: 140,
      render: (_: unknown, record) =>
        record.groupName ? (
          <Tag color="cyan">{record.groupName}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      key: 'action',
      title: 'Action',
      width: 200,
      locked: true,
      render: (_: unknown, record) => (
        <Space size={4}>
          <Tooltip title="View detail">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              className="ldw-clickable"
              aria-label={`View ${record.name}`}
              onClick={() => navigate(`/git/projects/${record.id}`)}
            />
          </Tooltip>
          <Button size="small" className="ldw-clickable" onClick={() => openGroupModal([record.id])}>
            Group
          </Button>
          <ConfirmButton
            size="small"
            danger
            icon={<DeleteOutlined />}
            confirmTitle="Remove this project?"
            confirmDescription="Only removes the registry record — local files are kept."
            okText="Remove"
            onConfirm={async () => {
              await deleteMutation.mutateAsync(record.id);
            }}
            aria-label={`Delete ${record.name}`}
          />
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Git Projects"
      subTitle="Local repositories discovered under scanned paths"
      error={isError ? (error as Error) : null}
      onRetry={() => refetchProjects()}
      extra={
        <Space wrap>
          <Link to="/git/groups">
            <Button icon={<ClusterOutlined />} className="ldw-clickable">
              Manage Groups
            </Button>
          </Link>
        </Space>
      }
    >
      <div className="git-scan-bar">
        <Input
          className="git-scan-bar__path"
          placeholder="Scan path, e.g. ~/project"
          value={scanPath}
          onChange={(e) => setScanPath(e.target.value)}
          onPressEnter={handleScan}
          disabled={scanMutation.isPending}
          aria-label="Scan path"
        />
        <InputNumber
          className="git-scan-bar__depth"
          min={1}
          max={10}
          value={maxDepth}
          onChange={(v) => setMaxDepth(Number(v) || 5)}
          disabled={scanMutation.isPending}
          aria-label="Max depth"
        />
        <Button
          type="primary"
          icon={<ScanOutlined />}
          onClick={handleScan}
          loading={scanMutation.isPending}
          disabled={scanMutation.isPending}
          className="ldw-clickable"
        >
          Scan
        </Button>
      </div>

      {selectedRowKeys.length > 0 && (
        <div className="git-batch-bar" role="status">
          <span>
            Selected <strong>{selectedRowKeys.length}</strong> project
            {selectedRowKeys.length === 1 ? '' : 's'}
          </span>
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<TeamOutlined />}
              className="ldw-clickable"
              onClick={() => openGroupModal(selectedRowKeys)}
            >
              Assign to Group
            </Button>
            <Button size="small" className="ldw-clickable" onClick={() => setSelectedRowKeys([])}>
              Clear
            </Button>
          </Space>
        </div>
      )}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          preset="folder"
          title="No git projects"
          description="Scan a directory to discover local repositories."
          action={{
            text: 'Scan Projects',
            icon: <ScanOutlined />,
            onClick: () => {
              if (!scanPath.trim()) {
                appMessage.info('Enter a path above, then click Scan');
                return;
              }
              handleScan();
            },
          }}
        />
      ) : (
        <DataTable<GitProjectListItem>
          rowKey="id"
          loading={isLoading || isFetching}
          dataSource={filteredItems}
          columns={columns}
          searchable
          searchPlaceholder="Search name, path, branch…"
          searchValue={searchQ}
          onSearch={setSearch}
          onRefresh={() => refetchProjects()}
          emptyTitle={searchQ ? 'No matching projects' : 'No git projects'}
          emptyDescription={
            searchQ
              ? 'Try a different search term.'
              : 'Scan a directory to discover local repositories.'
          }
          emptyAction={
            searchQ
              ? undefined
              : {
                  text: 'Scan Projects',
                  onClick: handleScan,
                }
          }
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 960 }}
        />
      )}

      <Modal
        title={
          selectedRowKeys.length > 1
            ? `Assign ${selectedRowKeys.length} projects to a group`
            : 'Assign project to a group'
        }
        open={groupModalOpen}
        onOk={() => {
          if (!selectGroupId) {
            appMessage.warning('Select a target group');
            return;
          }
          assignGroupMutation.mutate({
            projectIds: selectedRowKeys,
            groupId: selectGroupId,
          });
        }}
        onCancel={() => {
          setGroupModalOpen(false);
          setSelectGroupId(undefined);
        }}
        confirmLoading={assignGroupMutation.isPending}
        okButtonProps={{ disabled: !selectGroupId }}
        okText="Assign"
        destroyOnHidden
      >
        <div className="git-assign-modal">
          <Text type="secondary">
            {selectedRowKeys.length} project{selectedRowKeys.length === 1 ? '' : 's'} selected
          </Text>
          <Select
            style={{ width: '100%', marginTop: 12 }}
            placeholder="Select target group"
            value={selectGroupId}
            onChange={setSelectGroupId}
            options={groups.map((g) => ({
              label: `${g.name} (${g.projectCount} projects)`,
              value: g.id,
            }))}
            showSearch
            optionFilterProp="label"
            notFoundContent={
              <EmptyState
                title="No groups"
                description="Create a group first."
                action={{
                  text: 'Manage Groups',
                  onClick: () => {
                    setGroupModalOpen(false);
                    navigate('/git/groups');
                  },
                }}
              />
            }
          />
        </div>
      </Modal>
    </PageContainer>
  );
};

export default GitProjects;
