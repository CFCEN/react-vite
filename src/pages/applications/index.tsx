import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Select, Space, Tag, Tooltip } from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { applicationApi } from '@/api/applicationApi';
import type {
  ApplicationItem,
  ApplicationStatus,
  ApplicationStatusInfo,
} from '@/types/application';
import { PROCESS_STATUS_LABEL } from '@/types/application';
import { usePolling } from '@/hooks';
import {
  PageContainer,
  DataTable,
  StatusTag,
  ConfirmButton,
  PathText,
} from '@/components';
import type { DataTableColumn } from '@/components';
import './index.less';

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'STOPPED', label: 'Stopped' },
  { value: 'STARTING', label: 'Starting' },
  { value: 'STOPPING', label: 'Stopping' },
  { value: 'FAILED', label: 'Failed' },
];

const ApplicationList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'all';

  const [runtimeMap, setRuntimeMap] = useState<
    Record<number, ApplicationStatusInfo>
  >({});

  const listQuery = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationApi.list(),
  });

  // Stabilize empty fallback — otherwise filtered useMemo recomputes every render while loading
  const items = useMemo(
    () => listQuery.data?.data?.items ?? [],
    [listQuery.data?.data?.items]
  );

  const syncSearchParams = useCallback(
    (next: { q?: string; status?: string }) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          const qVal = next.q !== undefined ? next.q : (params.get('q') ?? '');
          const stVal =
            next.status !== undefined
              ? next.status
              : (params.get('status') ?? 'all');
          if (qVal.trim()) params.set('q', qVal.trim());
          else params.delete('q');
          if (stVal && stVal !== 'all') params.set('status', stVal);
          else params.delete('status');
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const pollStatus = useCallback(async () => {
    const current = listQuery.data?.data?.items;
    if (!current?.length) {
      setRuntimeMap({});
      return;
    }
    try {
      const statuses = await applicationApi.listStatus(
        current.map((i) => i.id)
      );
      const next: Record<number, ApplicationStatusInfo> = {};
      for (const s of statuses) {
        next[s.id] = s;
      }
      setRuntimeMap(next);
    } catch {
      // listStatus already degrades internally; ignore outer failures
    }
  }, [listQuery.data]);

  usePolling(pollStatus, {
    interval: 5000,
    enabled: items.length > 0,
    immediate: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => applicationApi.delete(id),
    onSuccess: () => {
      appMessage.success('Deleted');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ id, commandName }: { id: number; commandName?: string }) =>
      applicationApi.start(id, commandName),
    onSuccess: (res) => {
      const name = res.data?.commandName;
      appMessage.success(name ? `Started 「${name}」` : 'Started');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void pollStatus();
    },
  });

  const stopMutation = useMutation({
    mutationFn: (id: number) => applicationApi.stop(id),
    onSuccess: () => {
      appMessage.success('Stopped');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void pollStatus();
    },
  });

  const restartMutation = useMutation({
    mutationFn: ({ id, commandName }: { id: number; commandName?: string }) =>
      applicationApi.restart(id, commandName),
    onSuccess: (res) => {
      const name = res.data?.commandName;
      appMessage.success(name ? `Restarted 「${name}」` : 'Restarted');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void pollStatus();
    },
  });

  const rowBusy = useCallback(
    (id: number) =>
      (startMutation.isPending && startMutation.variables?.id === id) ||
      (stopMutation.isPending && stopMutation.variables === id) ||
      (restartMutation.isPending && restartMutation.variables?.id === id) ||
      (deleteMutation.isPending && deleteMutation.variables === id),
    [
      startMutation.isPending,
      startMutation.variables,
      stopMutation.isPending,
      stopMutation.variables,
      restartMutation.isPending,
      restartMutation.variables,
      deleteMutation.isPending,
      deleteMutation.variables,
    ]
  );

  const confirmRestart = useCallback(
    (id: number, commandName?: string) => {
      modal.confirm({
        title: 'Restart this application?',
        content: commandName
          ? `Command “${commandName}” will be started after stop.`
          : 'The process will be stopped and started again.',
        okText: 'Restart',
        okButtonProps: { danger: true },
        onOk: () => restartMutation.mutateAsync({ id, commandName }),
      });
    },
    [modal, restartMutation]
  );

  const filteredItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      const status = runtimeMap[item.id]?.status ?? 'STOPPED';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!needle) return true;
      const cmdBlob = (item.commands ?? [])
        .map((c) => `${c.name} ${c.command}`)
        .join(' ');
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.description || '').toLowerCase().includes(needle) ||
        (item.workingDirectory || '').toLowerCase().includes(needle) ||
        cmdBlob.toLowerCase().includes(needle)
      );
    });
  }, [items, q, statusFilter, runtimeMap]);

  const columns: DataTableColumn<ApplicationItem>[] = useMemo(
    () => [
      {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        width: 180,
        ellipsis: true,
        render: (_value, record) => (
          <Link
            className="ldw-clickable app-name-link"
            to={`/applications/${record.id}`}
          >
            {record.name}
          </Link>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        width: 120,
        render: (_value, record) => {
          const status = (runtimeMap[record.id]?.status ??
            'STOPPED') as ApplicationStatus;
          return (
            <StatusTag
              status={status}
              kind="process"
              label={PROCESS_STATUS_LABEL[status] ?? status}
            />
          );
        },
      },
      {
        key: 'pid',
        title: 'PID / Command',
        width: 160,
        render: (_value, record) => {
          const rt = runtimeMap[record.id];
          if (rt?.status === 'RUNNING' && rt.pid != null) {
            return (
              <Space size={4} wrap>
                <Tag>PID {rt.pid}</Tag>
                {rt.commandName ? (
                  <Tooltip title={rt.commandName}>
                    <Tag className="app-cmd-tag">{rt.commandName}</Tag>
                  </Tooltip>
                ) : null}
              </Space>
            );
          }
          return <span className="app-muted">—</span>;
        },
      },
      {
        key: 'commands',
        title: 'Commands',
        ellipsis: true,
        render: (_value, record) => {
          const cmds = record.commands ?? [];
          if (!cmds.length) return <span className="app-muted">—</span>;
          return (
            <Space size={4} wrap className="app-cmd-list">
              {cmds.map((c) => (
                <Tooltip key={c.name} title={c.command}>
                  <Tag className="app-cmd-tag ldw-clickable">{c.name}</Tag>
                </Tooltip>
              ))}
            </Space>
          );
        },
      },
      {
        key: 'cwd',
        title: 'Working Dir',
        width: 200,
        ellipsis: true,
        render: (_value, record) =>
          record.workingDirectory ? (
            <PathText path={record.workingDirectory} />
          ) : (
            <span className="app-muted">—</span>
          ),
      },
      {
        key: 'action',
        title: 'Actions',
        width: 260,
        fixed: 'right',
        render: (_value, record) => {
          const rt = runtimeMap[record.id];
          const status = rt?.status ?? 'STOPPED';
          const isRunning = status === 'RUNNING';
          const isTransitioning =
            status === 'STARTING' || status === 'STOPPING';
          const busy = rowBusy(record.id);
          const cmds = record.commands ?? [];
          const hasMulti = cmds.length > 1;

          const startMenu = hasMulti
            ? {
                items: cmds.map((c) => ({
                  key: c.name,
                  label: (
                    <span className="app-menu-cmd">
                      <Tooltip
                        title={`Command: ${c.command}`}
                        placement="right"
                      >
                        <strong>{c.name}</strong>
                      </Tooltip>
                    </span>
                  ),
                })),
                onClick: ({ key }: { key: string }) =>
                  startMutation.mutate({ id: record.id, commandName: key }),
              }
            : undefined;

          const restartMenu = hasMulti
            ? {
                items: cmds.map((c) => ({
                  key: c.name,
                  label: (
                    <span className="app-menu-cmd">
                      <strong>{c.name}</strong>
                      <span className="app-menu-cmd__code">{c.command}</span>
                    </span>
                  ),
                })),
                onClick: ({ key }: { key: string }) =>
                  confirmRestart(record.id, key),
              }
            : undefined;

          return (
            <Space size="small" wrap className="app-row-actions">
              {isRunning ? (
                <>
                  <ConfirmButton
                    size="small"
                    icon={<PauseCircleOutlined />}
                    confirmTitle="Stop this application?"
                    confirmDescription="The running process will be terminated."
                    okText="Stop"
                    loading={
                      stopMutation.isPending &&
                      stopMutation.variables === record.id
                    }
                    disabled={busy}
                    onConfirm={async () => {
                      await stopMutation.mutateAsync(record.id);
                    }}
                  >
                    Stop
                  </ConfirmButton>
                  {hasMulti ? (
                    <Dropdown menu={restartMenu} disabled={busy}>
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        disabled={busy}
                        className="ldw-clickable"
                        aria-label="Restart"
                      >
                        Restart <DownOutlined />
                      </Button>
                    </Dropdown>
                  ) : (
                    <ConfirmButton
                      size="small"
                      icon={<ReloadOutlined />}
                      confirmTitle="Restart this application?"
                      confirmDescription="The process will be stopped and started again."
                      okText="Restart"
                      loading={
                        restartMutation.isPending &&
                        restartMutation.variables?.id === record.id
                      }
                      disabled={busy}
                      onConfirm={async () => {
                        await restartMutation.mutateAsync({ id: record.id });
                      }}
                    >
                      Restart
                    </ConfirmButton>
                  )}
                </>
              ) : (
                <>
                  {hasMulti ? (
                    <Dropdown
                      menu={startMenu}
                      disabled={busy || isTransitioning}
                    >
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        disabled={busy || isTransitioning}
                        loading={
                          startMutation.isPending &&
                          startMutation.variables?.id === record.id
                        }
                        className="ldw-clickable"
                        aria-label="Start"
                      >
                        Start <DownOutlined />
                      </Button>
                    </Dropdown>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      className="ldw-clickable"
                      onClick={() => startMutation.mutate({ id: record.id })}
                      loading={
                        startMutation.isPending &&
                        startMutation.variables?.id === record.id
                      }
                      disabled={busy || isTransitioning}
                      aria-label="Start"
                    >
                      Start
                    </Button>
                  )}
                </>
              )}
              <Button
                size="small"
                icon={<EyeOutlined />}
                className="ldw-clickable"
                aria-label="View details"
                title="View details"
                onClick={() => navigate(`/applications/${record.id}`)}
              />
              <Button
                size="small"
                icon={<EditOutlined />}
                className="ldw-clickable"
                aria-label="Edit"
                title="Edit"
                onClick={() => navigate(`/applications/${record.id}/edit`)}
              />
              <ConfirmButton
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label="Delete"
                title="Delete"
                confirmTitle="Delete this application?"
                confirmDescription="If it is running, it will be stopped first. This cannot be undone."
                okText="Delete"
                loading={
                  deleteMutation.isPending &&
                  deleteMutation.variables === record.id
                }
                disabled={busy}
                onConfirm={async () => {
                  await deleteMutation.mutateAsync(record.id);
                }}
              />
            </Space>
          );
        },
      },
    ],
    [
      runtimeMap,
      rowBusy,
      navigate,
      startMutation,
      stopMutation,
      restartMutation,
      deleteMutation,
      confirmRestart,
    ]
  );

  const handleRefresh = () => {
    void listQuery.refetch();
    void pollStatus();
  };

  return (
    <PageContainer
      title="Applications"
      subTitle="Manage local processes"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="ldw-clickable"
          onClick={() => navigate('/applications/new')}
        >
          New Application
        </Button>
      }
      error={listQuery.isError ? listQuery.error : null}
      onRetry={() => void listQuery.refetch()}
      loading={listQuery.isLoading}
      loadingVariant="table"
      className="applications-page"
    >
      <DataTable<ApplicationItem>
        rowKey="id"
        dataSource={filteredItems}
        columns={columns}
        loading={listQuery.isFetching && !listQuery.isLoading}
        searchable
        searchPlaceholder="Search name, path, command…"
        searchValue={q}
        onSearch={(value) => syncSearchParams({ q: value })}
        onRefresh={handleRefresh}
        emptyTitle={
          q || statusFilter !== 'all'
            ? 'No matching applications'
            : 'No applications'
        }
        emptyDescription={
          q || statusFilter !== 'all'
            ? 'Try a different search or clear filters.'
            : 'Create your first local app to get started.'
        }
        emptyAction={
          q || statusFilter !== 'all'
            ? undefined
            : {
                text: 'New Application',
                onClick: () => navigate('/applications/new'),
              }
        }
        toolbarExtra={
          <Select
            className="app-status-filter"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => syncSearchParams({ status: value })}
            aria-label="Filter by status"
            popupMatchSelectWidth={false}
          />
        }
        scroll={{ x: 960 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} items`,
        }}
      />
    </PageContainer>
  );
};

export default ApplicationList;
