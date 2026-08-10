import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Tag,
  Badge,
  Popconfirm,
  App,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router';
import { applicationApi } from '@/api/applicationApi';
import type { ApplicationItem, ApplicationStatus } from '@/types/application';
import { getApplicationStatusInfo } from '@/utils/format';
import { usePolling } from '@/hooks/usePolling';
import PageContainer from '@/components/PageContainer';
import './index.less';

/** 运行时状态快照 */
interface RuntimeInfo {
  status: ApplicationStatus;
  pid?: number | null;
  commandName?: string;
}

const ApplicationList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();
  const [runtimeMap, setRuntimeMap] = useState<Record<number, RuntimeInfo>>({});

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => applicationApi.delete(id),
    onSuccess: () => {
      appMessage.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ id, commandName }: { id: number; commandName?: string }) =>
      applicationApi.start(id, commandName),
    onSuccess: (res: any) => {
      const name = res.data?.commandName;
      appMessage.success(name ? `「${name}」启动成功` : '启动成功');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: (id: number) => applicationApi.stop(id),
    onSuccess: () => {
      appMessage.success('已停止');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const restartMutation = useMutation({
    mutationFn: ({ id, commandName }: { id: number; commandName?: string }) =>
      applicationApi.restart(id, commandName),
    onSuccess: (res: any) => {
      const name = res.data?.commandName;
      appMessage.success(name ? `「${name}」重启成功` : '重启成功');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  // 轮询所有应用状态
  const pollStatus = useCallback(async () => {
    const items = data?.data?.items;
    if (!items || items.length === 0) return;
    const newMap: Record<number, RuntimeInfo> = {};
    await Promise.all(
      items.map(async (item: ApplicationItem) => {
        try {
          const res = await applicationApi.status(item.id);
          newMap[item.id] = {
            status: res.data.status,
            pid: res.data.pid,
            commandName: res.data.commandName,
          };
        } catch {
          // 忽略单条状态获取失败
        }
      })
    );
    setRuntimeMap((prev) => ({ ...prev, ...newMap }));
  }, [data]);

  usePolling(pollStatus, 5000, true);

  const handleRefresh = useCallback(() => {
    refetch();
    pollStatus();
  }, [pollStatus, refetch]);

  const items = data?.data?.items || [];

  const columns: ColumnsType<ApplicationItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ApplicationItem) => (
        <a onClick={() => navigate(`/applications/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, record: ApplicationItem) => {
        const rt = runtimeMap[record.id];
        const status = rt?.status || 'STOPPED';
        const info = getApplicationStatusInfo(status);
        return (
          <Badge
            status={info.color as any}
            text={info.label}
          />
        );
      },
    },
    {
      title: 'PID / Command',
      key: 'pid',
      width: 180,
      render: (_: unknown, record: ApplicationItem) => {
        const rt = runtimeMap[record.id];
        if (rt?.status === 'RUNNING' && rt.pid) {
          return (
            <Space size={4}>
              <Tag color="green">PID {rt.pid}</Tag>
              {rt.commandName && <Tag>{rt.commandName}</Tag>}
            </Space>
          );
        }
        return <Tag>—</Tag>;
      },
    },
    {
      title: 'Commands',
      dataIndex: 'commands',
      key: 'commands',
      render: (cmds: ApplicationItem['commands']) =>
        cmds?.length > 0 ? (
          <Space size={4} wrap>
            {cmds.map((c) => (
              <Tag key={c.name} color="blue" style={{ fontSize: 11 }}>
                {c.name === 'default' ? c.command : `${c.name}: ${c.command}`}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag>—</Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 280,
      render: (_: unknown, record: ApplicationItem) => {
        const rt = runtimeMap[record.id];
        const status = rt?.status || 'STOPPED';
        const isRunning = status === 'RUNNING';
        const isTransitioning = status === 'STARTING' || status === 'STOPPING';
        const busy = startMutation.isPending || stopMutation.isPending || restartMutation.isPending;

        const cmds = record.commands || [];
        const hasMulti = cmds.length > 1;

        // 多命令 → 下拉菜单选择启动哪个命令
        const startMenu = hasMulti
          ? {
              items: cmds.map((c) => ({
                key: c.name,
                label: (
                  <span>
                    <strong>{c.name}</strong>
                    <span style={{ color: '#8c8c8c', marginLeft: 8, fontSize: 12 }}>
                      {c.command}
                    </span>
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
                  <span>
                    <strong>{c.name}</strong>
                    <span style={{ color: '#8c8c8c', marginLeft: 8, fontSize: 12 }}>
                      {c.command}
                    </span>
                  </span>
                ),
              })),
              onClick: ({ key }: { key: string }) =>
                restartMutation.mutate({ id: record.id, commandName: key }),
            }
          : undefined;

        return (
          <Space size="small" wrap>
            {isRunning ? (
              <>
                <Button
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={() => stopMutation.mutate(record.id)}
                  loading={stopMutation.isPending}
                  disabled={busy}
                >
                  Stop
                </Button>
                {hasMulti ? (
                  <Dropdown menu={restartMenu} disabled={busy}>
                    <Button size="small" icon={<ReloadOutlined />} disabled={busy}>
                      Restart <DownOutlined />
                    </Button>
                  </Dropdown>
                ) : (
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => restartMutation.mutate({ id: record.id })}
                    loading={restartMutation.isPending}
                    disabled={busy}
                  >
                    Restart
                  </Button>
                )}
              </>
            ) : (
              <>
                {hasMulti ? (
                  <Dropdown menu={startMenu} disabled={busy || isTransitioning}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      disabled={busy || isTransitioning}
                    >
                      Start <DownOutlined />
                    </Button>
                  </Dropdown>
                ) : (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => startMutation.mutate({ id: record.id })}
                    loading={startMutation.isPending}
                    disabled={busy || isTransitioning}
                  >
                    Start
                  </Button>
                )}
              </>
            )}
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/applications/${record.id}`)}
            />
            <Popconfirm
              title="确认删除"
              description="若应用在运行中会先停止再删除"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="Applications"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isFetching}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/applications/new')}
          >
            Add Application
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(r) => ({
          onDoubleClick: () => navigate(`/applications/${r.id}`),
        })}
      />
    </PageContainer>
  );
};

export default ApplicationList;
