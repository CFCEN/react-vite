import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import {
  Descriptions,
  Button,
  Space,
  Tag,
  Spin,
  App,
  Tabs,
  Typography,
  Card,
  Dropdown,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DownOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { applicationApi } from '@/api/applicationApi';
import { getApplicationStatusInfo, formatDateTime } from '@/utils/format';
import { usePolling } from '@/hooks/usePolling';
import PageContainer from '@/components/PageContainer';
import './index.less';

const { Text } = Typography;

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const {
    data: appData,
    isLoading,
    isFetching: appFetching,
    refetch: refetchApp,
  } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.getById(Number(id)),
    enabled: !!id,
  });

  const {
    data: statusData,
    refetch: refetchStatus,
    isFetching: statusFetching,
  } = useQuery({
    queryKey: ['applicationStatus', id],
    queryFn: () => applicationApi.status(Number(id)),
    enabled: !!id,
    gcTime: 0,
  });

  // 5s 轮询状态
  usePolling(() => {
    refetchStatus();
  }, 5000, true);

  const startMutation = useMutation({
    mutationFn: (commandName?: string) => applicationApi.start(Number(id), commandName),
    onSuccess: (res: any) => {
      const name = res.data?.commandName;
      message.success(name ? `「${name}」启动成功` : '启动成功');
      refetchStatus();
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => applicationApi.stop(Number(id)),
    onSuccess: () => {
      message.success('已停止');
      refetchStatus();
    },
  });

  const restartMutation = useMutation({
    mutationFn: (commandName?: string) => applicationApi.restart(Number(id), commandName),
    onSuccess: (res: any) => {
      const name = res.data?.commandName;
      message.success(name ? `「${name}」重启成功` : '重启成功');
      refetchStatus();
    },
  });

  const app = appData?.data;
  const status = statusData?.data;
  const statusInfo = status ? getApplicationStatusInfo(status.status) : { label: '—', color: 'default' };
  const isRunning = status?.status === 'RUNNING';
  const isTransitioning = status?.status === 'STARTING' || status?.status === 'STOPPING';
  const busy = startMutation.isPending || stopMutation.isPending || restartMutation.isPending;
  const refreshing = appFetching || statusFetching;

  const handleRefresh = () => {
    refetchApp();
    refetchStatus();
  };

  const cmds = app?.commands || [];
  const hasMulti = cmds.length > 1;

  // 多命令选择菜单
  const cmdMenu = hasMulti
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
      }
    : undefined;

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
      </PageContainer>
    );
  }

  if (!app) {
    return (
      <PageContainer title="Not Found">
        <p>应用不存在</p>
        <Button onClick={() => navigate('/applications')}>返回列表</Button>
      </PageContainer>
    );
  }

  // 解析 environment JSON
  let envObj: Record<string, string> = {};
  try {
    if (app.environment) envObj = JSON.parse(app.environment);
  } catch { /* ignore */ }

  const stdoutUrl = `workspace/applications/${id}/stdout.log`;
  const stderrUrl = `workspace/applications/${id}/stderr.log`;

  // 渲染 Start/Restart 按钮（支持多命令下拉）
  const StartButton = () => {
    if (hasMulti) {
      return (
        <Dropdown
          menu={{
            ...cmdMenu,
            onClick: ({ key }: { key: string }) => startMutation.mutate(key),
          }}
          disabled={busy || isTransitioning}
        >
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={startMutation.isPending}
            disabled={busy || isTransitioning}
          >
            Start <DownOutlined />
          </Button>
        </Dropdown>
      );
    }
    return (
      <Button
        type="primary"
        icon={<PlayCircleOutlined />}
        onClick={() => startMutation.mutate()}
        loading={startMutation.isPending}
        disabled={busy || isTransitioning}
      >
        Start
      </Button>
    );
  };

  const RestartButton = () => {
    if (hasMulti) {
      return (
        <Dropdown
          menu={{
            ...cmdMenu,
            onClick: ({ key }: { key: string }) => restartMutation.mutate(key),
          }}
          disabled={busy}
        >
          <Button
            icon={<ReloadOutlined />}
            loading={restartMutation.isPending}
            disabled={busy}
          >
            Restart <DownOutlined />
          </Button>
        </Dropdown>
      );
    }
    return (
      <Button
        icon={<ReloadOutlined />}
        onClick={() => restartMutation.mutate()}
        loading={restartMutation.isPending}
        disabled={busy}
      >
        Restart
      </Button>
    );
  };

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginTop: 16 }}>
          <Descriptions.Item label="Name">{app.name}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="PID">
            {status?.pid || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Running Command">
            {status?.commandName ? (
              <Tag color="green">{status.commandName}</Tag>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Commands" span={2}>
            {cmds.length === 0 ? (
              '—'
            ) : (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {cmds.map((c) => (
                  <Tag key={c.name} color="blue" style={{ fontSize: 13 }}>
                    {c.name === 'default' ? (
                      <code>{c.command}</code>
                    ) : (
                      <>
                        <strong>{c.name}</strong>:{' '}
                        <code style={{ marginLeft: 4 }}>{c.command}</code>
                      </>
                    )}
                  </Tag>
                ))}
              </Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Working Directory">
            {app.workingDirectory || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Started At">
            {status?.startedAt ? formatDateTime(status.startedAt) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Uptime">
            {status?.uptime || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Auto Start">
            <Tag color={app.autoStart ? 'green' : 'default'}>{app.autoStart ? 'Yes' : 'No'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {app.description || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Environment" span={2}>
            {Object.keys(envObj).length > 0 ? (
              <pre style={{ margin: 0, fontSize: 12, maxHeight: 120, overflow: 'auto' }}>
                {JSON.stringify(envObj, null, 2)}
              </pre>
            ) : (
              '—'
            )}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'stdout',
      label: 'stdout.log',
      children: (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            输出路径: <code>{stdoutUrl}</code>
          </Text>
          <Card style={{ background: '#1e1e1e', color: '#d4d4d4', minHeight: 200, fontFamily: 'monospace', fontSize: 13 }}>
            <Text style={{ color: '#8c8c8c' }}>
              应用启动后，stdout 输出将自动写入上述路径。
              <br />
              可通过日志管理模块添加该路径进行实时查看。
            </Text>
          </Card>
        </div>
      ),
    },
    {
      key: 'stderr',
      label: 'stderr.log',
      children: (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            输出路径: <code>{stderrUrl}</code>
          </Text>
          <Card style={{ background: '#1e1e1e', color: '#f85149', minHeight: 200, fontFamily: 'monospace', fontSize: 13 }}>
            <Text style={{ color: '#8c8c8c' }}>
              应用启动后，stderr 输出将自动写入上述路径。
            </Text>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={app.name}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            刷新
          </Button>
          {isRunning ? (
            <>
              <Button
                icon={<PauseCircleOutlined />}
                onClick={() => stopMutation.mutate()}
                loading={stopMutation.isPending}
                disabled={busy}
              >
                Stop
              </Button>
              <RestartButton />
            </>
          ) : (
            <StartButton />
          )}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/applications')}
          >
            返回
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/applications/${id}/edit`)}
          >
            编辑
          </Button>
        </Space>
      }
    >
      <Tabs items={tabItems} />
    </PageContainer>
  );
};

export default ApplicationDetail;
