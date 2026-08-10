import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import {
  CodeOutlined,
  BranchesOutlined,
  FileTextOutlined,
  SettingOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router';
import { dashboardApi, type DashboardSummary } from '@/api/dashboardApi';
import { applicationApi } from '@/api/applicationApi';
import { workspaceApi } from '@/api/workspaceApi';
import {
  PageContainer,
  StatusTag,
  EmptyState,
  PathText,
  ConfirmButton,
  TimeText,
} from '@/components';
import './index.less';

const { Text } = Typography;

function commandHint(commands?: { name: string; command: string }[]): string {
  if (!commands?.length) return 'No commands';
  if (commands.length === 1) {
    return `${commands[0].name}: ${commands[0].command}`;
  }
  return `${commands[0].name} (+${commands.length - 1} more)`;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
  });

  const workspaceQuery = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => applicationApi.start(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: (id: number) => applicationApi.stop(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });

  const summary = summaryQuery.data;
  const workspace = workspaceQuery.data?.data;
  const refreshing = summaryQuery.isFetching || workspaceQuery.isFetching;

  const handleRefresh = () => {
    void summaryQuery.refetch();
    void workspaceQuery.refetch();
  };

  const runningApps =
    summary?.recentApps.filter((a) => a.status === 'RUNNING') ?? [];

  return (
    <PageContainer
      title="Dashboard"
      subTitle="Overview of local apps, git projects, and workspace"
      loading={summaryQuery.isLoading}
      loadingVariant="cards"
      error={summaryQuery.error}
      onRetry={() => void summaryQuery.refetch()}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
          aria-label="Refresh dashboard"
        >
          Refresh
        </Button>
      }
    >
      {summary ? <DashboardBody
        summary={summary}
        workspaceRoot={workspace?.root}
        contextCount={workspace?.contexts?.length ?? 0}
        ragDirCount={workspace?.ragDirs?.length ?? 0}
        indexDirCount={workspace?.indexDirs?.length ?? 0}
        workspaceLoading={workspaceQuery.isLoading}
        runningApps={runningApps}
        navigate={navigate}
        onStart={(id) => startMutation.mutate(id)}
        onStop={(id) => stopMutation.mutate(id)}
        startPending={startMutation.isPending}
        stopPending={stopMutation.isPending}
      /> : null}
    </PageContainer>
  );
};

interface DashboardBodyProps {
  summary: DashboardSummary;
  workspaceRoot?: string;
  contextCount: number;
  ragDirCount: number;
  indexDirCount: number;
  workspaceLoading: boolean;
  runningApps: DashboardSummary['recentApps'];
  navigate: ReturnType<typeof useNavigate>;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  startPending: boolean;
  stopPending: boolean;
}

function DashboardBody({
  summary,
  workspaceRoot,
  contextCount,
  ragDirCount,
  indexDirCount,
  workspaceLoading,
  runningApps,
  navigate,
  onStart,
  onStop,
  startPending,
  stopPending,
}: DashboardBodyProps) {
  const metrics: Array<{
    key: string;
    title: string;
    value: number;
    icon: ReactNode;
    path: string;
    hide?: boolean;
  }> = [
    {
      key: 'apps',
      title: 'Applications',
      value: summary.applicationCount,
      icon: <CodeOutlined />,
      path: '/applications',
    },
    {
      key: 'running',
      title: 'Running',
      value: summary.runningCount ?? 0,
      icon: <ThunderboltOutlined />,
      path: '/applications',
      hide: summary.runningCount === null,
    },
    {
      key: 'git',
      title: 'Git Projects',
      value: summary.gitProjectCount,
      icon: <BranchesOutlined />,
      path: '/git/projects',
    },
    {
      key: 'logs',
      title: 'Log Files',
      value: summary.logFileCount,
      icon: <FileTextOutlined />,
      path: '/logs',
    },
    {
      key: 'configs',
      title: 'Configurations',
      value: summary.configCount,
      icon: <SettingOutlined />,
      path: '/configurations',
    },
  ];

  const visibleMetrics = metrics.filter((m) => !m.hide);
  const colSpan = visibleMetrics.length <= 4 ? 6 : undefined;

  return (
    <div className="dashboard">
      <Row gutter={[16, 16]} className="dashboard-stats">
        {visibleMetrics.map((m) => (
          <Col
            key={m.key}
            xs={24}
            sm={12}
            md={colSpan ?? 8}
            lg={colSpan ?? 8}
            xl={colSpan ? colSpan : undefined}
            flex={colSpan ? undefined : '1 1 180px'}
          >
            <Card
              hoverable
              className="dashboard-stat-card ldw-clickable"
              onClick={() => navigate(m.path)}
              role="button"
              tabIndex={0}
              aria-label={`Go to ${m.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(m.path);
                }
              }}
            >
              <Statistic title={m.title} value={m.value} prefix={m.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="dashboard-detail">
        <Col xs={24} lg={12}>
          <Card
            title="Applications"
            extra={
              <Link to="/applications" className="dashboard-link ldw-clickable">
                View all →
              </Link>
            }
          >
            {summary.recentApps.length === 0 ? (
              <EmptyState
                preset="default"
                title="No applications"
                description="Create your first local app to start processes from the dashboard."
                action={{
                  text: 'New Application',
                  icon: <PlusOutlined />,
                  onClick: () => navigate('/applications/new'),
                }}
              />
            ) : (
              summary.recentApps.map((app) => {
                const canStop = app.status === 'RUNNING';
                const canStart =
                  !app.status ||
                  app.status === 'STOPPED' ||
                  app.status === 'FAILED' ||
                  app.status === 'UNKNOWN';
                return (
                  <div
                    key={app.id}
                    className="dashboard-item ldw-clickable"
                    onClick={() => navigate(`/applications/${app.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/applications/${app.id}`);
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    <div className="dashboard-item-info">
                      <Text strong>{app.name}</Text>
                      <Text type="secondary" ellipsis className="dashboard-item-sub">
                        {commandHint(app.commands)}
                      </Text>
                      {app.path ? <PathText path={app.path} /> : null}
                    </div>
                    <Space size="small" onClick={(e) => e.stopPropagation()}>
                      {app.status ? (
                        <StatusTag status={app.status} kind="process" />
                      ) : (
                        <StatusTag status="UNKNOWN" kind="process" label="Unknown" />
                      )}
                      {canStop ? (
                        <ConfirmButton
                          size="small"
                          icon={<PauseCircleOutlined />}
                          confirmTitle="Stop this application?"
                          confirmDanger
                          aria-label={`Stop ${app.name}`}
                          title={`Stop ${app.name}`}
                          loading={stopPending}
                          onConfirm={() => onStop(app.id)}
                        >
                          Stop
                        </ConfirmButton>
                      ) : null}
                      {canStart ? (
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          aria-label={`Start ${app.name}`}
                          title={`Start ${app.name}`}
                          loading={startPending}
                          onClick={() => onStart(app.id)}
                        >
                          Start
                        </Button>
                      ) : null}
                    </Space>
                  </div>
                );
              })
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Running now"
            extra={
              <Link to="/applications" className="dashboard-link ldw-clickable">
                Manage →
              </Link>
            }
          >
            {summary.runningCount === null ? (
              <EmptyState
                title="Status unavailable"
                description="Runtime status could not be determined. Open Applications to check each process."
                action={{
                  text: 'Open Applications',
                  onClick: () => navigate('/applications'),
                }}
              />
            ) : runningApps.length === 0 ? (
              <EmptyState
                title="Nothing running"
                description="Start an application from the list or Applications page."
                action={{
                  text: 'Open Applications',
                  onClick: () => navigate('/applications'),
                }}
              />
            ) : (
              runningApps.map((app) => (
                <div
                  key={app.id}
                  className="dashboard-item ldw-clickable"
                  onClick={() => navigate(`/applications/${app.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/applications/${app.id}`);
                  }}
                >
                  <div className="dashboard-item-info">
                    <Text strong>{app.name}</Text>
                    <Text type="secondary" ellipsis className="dashboard-item-sub">
                      {commandHint(app.commands)}
                    </Text>
                  </div>
                  <StatusTag status="RUNNING" kind="process" />
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-detail">
        <Col xs={24} lg={12}>
          <Card
            title="Recent Git Projects"
            extra={
              <Link to="/git/projects" className="dashboard-link ldw-clickable">
                View all →
              </Link>
            }
          >
            {summary.recentProjects.length === 0 ? (
              <EmptyState
                preset="folder"
                title="No git projects"
                description="Scan a directory to register local repositories."
                action={{
                  text: 'Open Git Projects',
                  onClick: () => navigate('/git/projects'),
                }}
              />
            ) : (
              summary.recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="dashboard-item ldw-clickable"
                  onClick={() => navigate(`/git/projects/${proj.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/git/projects/${proj.id}`);
                  }}
                >
                  <div className="dashboard-item-info">
                    <Text strong>{proj.name}</Text>
                    <PathText path={proj.path} />
                    {proj.updatedAt ? (
                      <Text type="secondary" className="dashboard-item-meta">
                        Updated <TimeText value={proj.updatedAt} />
                      </Text>
                    ) : null}
                  </div>
                  <Space size="small">
                    {proj.branch ? (
                      <Text type="secondary" className="dashboard-branch">
                        {proj.branch}
                      </Text>
                    ) : null}
                    {proj.status ? (
                      <StatusTag status={proj.status} kind="git" />
                    ) : null}
                  </Space>
                </div>
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Workspace"
            extra={
              <Link to="/workspace/rag" className="dashboard-link ldw-clickable">
                Open →
              </Link>
            }
            loading={workspaceLoading}
          >
            {!workspaceRoot && !workspaceLoading ? (
              <EmptyState
                preset="folder"
                title="Workspace unavailable"
                description="Could not load workspace overview."
                action={{
                  text: 'Retry',
                  onClick: () => navigate('/workspace/rag'),
                }}
              />
            ) : (
              <div className="dashboard-workspace">
                <div className="dashboard-workspace-row">
                  <Text type="secondary">Root</Text>
                  {workspaceRoot ? <PathText path={workspaceRoot} /> : <Text>—</Text>}
                </div>
                <div className="dashboard-workspace-stats">
                  <button
                    type="button"
                    className="dashboard-workspace-chip ldw-clickable"
                    onClick={() => navigate('/workspace/rag')}
                    aria-label="Open RAG directories"
                  >
                    <FolderOpenOutlined />
                    <span>{ragDirCount} RAG dirs</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-workspace-chip ldw-clickable"
                    onClick={() => navigate('/workspace/index')}
                    aria-label="Open Index directories"
                  >
                    <FolderOpenOutlined />
                    <span>{indexDirCount} Index dirs</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-workspace-chip ldw-clickable"
                    onClick={() => navigate('/workspace/index')}
                    aria-label="Open contexts"
                  >
                    <span>{contextCount} contexts</span>
                  </button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
