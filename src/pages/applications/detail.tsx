import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { App, Button, Descriptions, Dropdown, Space, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  DownOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { applicationApi } from '@/api/applicationApi';
import type { ApplicationStatus } from '@/types/application';
import { PROCESS_STATUS_LABEL } from '@/types/application';
import { usePolling } from '@/hooks';
import {
  PageContainer,
  StatusTag,
  ConfirmButton,
  PathText,
  TimeText,
  CopyableText,
} from '@/components';
import './index.less';

const ApplicationDetail = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();

  const id = Number(idParam);
  const idValid = Number.isFinite(id) && id > 0;

  const appQuery = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.getById(id, { silent: true }),
    enabled: idValid,
    retry: false,
  });

  const statusQuery = useQuery({
    queryKey: ['applicationStatus', id],
    queryFn: () => applicationApi.status(id, { silent: true }),
    enabled: idValid && !!appQuery.data?.data,
    gcTime: 0,
    retry: false,
  });

  const refetchStatus = statusQuery.refetch;

  usePolling(
    () => {
      void refetchStatus();
    },
    { interval: 5000, enabled: idValid && !!appQuery.data?.data },
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['applications'] });
    void queryClient.invalidateQueries({ queryKey: ['application', id] });
    void refetchStatus();
  }, [queryClient, id, refetchStatus]);

  const startMutation = useMutation({
    mutationFn: (commandName?: string) => applicationApi.start(id, commandName),
    onSuccess: (res) => {
      const name = res.data?.commandName;
      message.success(name ? `Started 「${name}」` : 'Started');
      invalidate();
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => applicationApi.stop(id),
    onSuccess: () => {
      message.success('Stopped');
      invalidate();
    },
  });

  const restartMutation = useMutation({
    mutationFn: (commandName?: string) => applicationApi.restart(id, commandName),
    onSuccess: (res) => {
      const name = res.data?.commandName;
      message.success(name ? `Restarted 「${name}」` : 'Restarted');
      invalidate();
    },
  });

  const app = appQuery.data?.data;
  const status = statusQuery.data?.data;
  const processStatus = (status?.status ?? 'STOPPED') as ApplicationStatus;
  const isRunning = processStatus === 'RUNNING';
  const isTransitioning = processStatus === 'STARTING' || processStatus === 'STOPPING';
  const busy =
    startMutation.isPending || stopMutation.isPending || restartMutation.isPending;

  const cmds = app?.commands ?? [];
  const hasMulti = cmds.length > 1;

  const envObj = useMemo(() => {
    if (!app?.environment) return {} as Record<string, string>;
    try {
      const parsed = JSON.parse(app.environment) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      /* ignore */
    }
    return {} as Record<string, string>;
  }, [app?.environment]);

  const confirmRestart = (commandName?: string) => {
    modal.confirm({
      title: 'Restart this application?',
      content: commandName
        ? `Command “${commandName}” will be started after stop.`
        : 'The process will be stopped and started again.',
      okText: 'Restart',
      okButtonProps: { danger: true },
      onOk: () => restartMutation.mutateAsync(commandName),
    });
  };

  const cmdMenuItems = hasMulti
    ? cmds.map((c) => ({
        key: c.name,
        label: (
          <span className="app-menu-cmd">
            <strong>{c.name}</strong>
            <span className="app-menu-cmd__code">{c.command}</span>
          </span>
        ),
      }))
    : undefined;

  if (!idValid) {
    return (
      <PageContainer
        title="Not Found"
        error="Invalid application id"
        onRetry={() => navigate('/applications')}
      />
    );
  }

  const notFound = !appQuery.isLoading && (appQuery.isError || !app);

  return (
    <PageContainer
      title={app?.name ?? 'Application'}
      subTitle={app ? `ID ${app.id}` : undefined}
      className="applications-page applications-detail"
      loading={appQuery.isLoading}
      loadingVariant="detail"
      error={
        appQuery.isError
          ? appQuery.error
          : notFound
            ? 'Application not found'
            : null
      }
      onRetry={() => {
        if (notFound) navigate('/applications');
        else void appQuery.refetch();
      }}
      extra={
        app ? (
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              className="ldw-clickable"
              aria-label="Refresh"
              title="Refresh"
              onClick={() => {
                void appQuery.refetch();
                void statusQuery.refetch();
              }}
              loading={appQuery.isFetching || statusQuery.isFetching}
            >
              Refresh
            </Button>
            {isRunning ? (
              <>
                <ConfirmButton
                  icon={<PauseCircleOutlined />}
                  confirmTitle="Stop this application?"
                  confirmDescription="The running process will be terminated."
                  okText="Stop"
                  loading={stopMutation.isPending}
                  disabled={busy}
                  onConfirm={async () => {
                    await stopMutation.mutateAsync();
                  }}
                >
                  Stop
                </ConfirmButton>
                {hasMulti ? (
                  <Dropdown
                    menu={{
                      items: cmdMenuItems,
                      onClick: ({ key }) => confirmRestart(key),
                    }}
                    disabled={busy}
                  >
                    <Button
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
                    icon={<ReloadOutlined />}
                    confirmTitle="Restart this application?"
                    confirmDescription="The process will be stopped and started again."
                    okText="Restart"
                    loading={restartMutation.isPending}
                    disabled={busy}
                    onConfirm={async () => {
                      await restartMutation.mutateAsync(undefined);
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
                    menu={{
                      items: cmdMenuItems,
                      onClick: ({ key }) => startMutation.mutate(key),
                    }}
                    disabled={busy || isTransitioning}
                  >
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={startMutation.isPending}
                      disabled={busy || isTransitioning}
                      className="ldw-clickable"
                      aria-label="Start"
                    >
                      Start <DownOutlined />
                    </Button>
                  </Dropdown>
                ) : (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    className="ldw-clickable"
                    onClick={() => startMutation.mutate(undefined)}
                    loading={startMutation.isPending}
                    disabled={busy || isTransitioning}
                    aria-label="Start"
                  >
                    Start
                  </Button>
                )}
              </>
            )}
            <Button
              icon={<EditOutlined />}
              className="ldw-clickable"
              onClick={() => navigate(`/applications/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              icon={<ArrowLeftOutlined />}
              className="ldw-clickable"
              onClick={() => navigate('/applications')}
            >
              Back
            </Button>
          </Space>
        ) : undefined
      }
    >
      {app ? (
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          className="app-detail-desc"
        >
          <Descriptions.Item label="Name">{app.name}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <StatusTag
              status={processStatus}
              kind="process"
              label={PROCESS_STATUS_LABEL[processStatus] ?? processStatus}
            />
          </Descriptions.Item>
          <Descriptions.Item label="PID">
            {isRunning && status?.pid != null ? (
              <CopyableText text={String(status.pid)} mono />
            ) : (
              <span className="app-muted">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Running Command">
            {isRunning && status?.commandName ? (
              <Tag>{status.commandName}</Tag>
            ) : (
              <span className="app-muted">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Commands" span={2}>
            {cmds.length === 0 ? (
              <span className="app-muted">—</span>
            ) : (
              <Space direction="vertical" size={4} className="app-cmd-stack">
                {cmds.map((c) => (
                  <div key={c.name} className="app-cmd-row">
                    <Tag>{c.name}</Tag>
                    <code className="app-cmd-code">{c.command}</code>
                  </div>
                ))}
              </Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Working Directory" span={2}>
            {app.workingDirectory ? (
              <PathText path={app.workingDirectory} />
            ) : (
              <span className="app-muted">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Started At">
            {isRunning && status?.startedAt ? (
              <TimeText value={status.startedAt} relative={false} />
            ) : (
              <span className="app-muted">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Uptime">
            {isRunning && status?.uptime ? (
              status.uptime
            ) : (
              <span className="app-muted">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Auto Start">
            {app.autoStart ? 'Yes' : 'No'}
          </Descriptions.Item>
          <Descriptions.Item label="Enabled">
            {app.enabled ? 'Yes' : 'No'}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {app.description || <span className="app-muted">—</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Environment" span={2}>
            {Object.keys(envObj).length > 0 ? (
              <pre className="app-env-pre">{JSON.stringify(envObj, null, 2)}</pre>
            ) : (
              <span className="app-muted">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            <TimeText value={app.updatedAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            <TimeText value={app.createdAt} />
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </PageContainer>
  );
};

export default ApplicationDetail;
