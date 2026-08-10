import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Row, Statistic, Tag, Typography, Spin, Empty } from 'antd';
import {
  CodeOutlined,
  BranchesOutlined,
  FileTextOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { applicationApi } from '@/api/applicationApi';
import { gitApi } from '@/api/gitApi';
import { logApi } from '@/api/logApi';
import { configApi } from '@/api/configApi';
import { getApplicationStatusInfo } from '@/utils/format';
import { shortenPath } from '@/utils/path';
import PageContainer from '@/components/PageContainer';
import './index.less';

const { Text, Title } = Typography;

const Dashboard = () => {
  // 并行加载多个模块的数据
  const appsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationApi.list(),
  });

  const projectsQuery = useQuery({
    queryKey: ['gitProjects'],
    queryFn: () => gitApi.listProjects(),
  });

  const logFilesQuery = useQuery({
    queryKey: ['logFiles'],
    queryFn: () => logApi.listFiles(),
  });

  const configsQuery = useQuery({
    queryKey: ['configFiles'],
    queryFn: () => configApi.list(),
  });

  const loading =
    appsQuery.isLoading &&
    projectsQuery.isLoading &&
    logFilesQuery.isLoading &&
    configsQuery.isLoading;

  const refreshing =
    appsQuery.isFetching ||
    projectsQuery.isFetching ||
    logFilesQuery.isFetching ||
    configsQuery.isFetching;

  const handleRefresh = () => {
    appsQuery.refetch();
    projectsQuery.refetch();
    logFilesQuery.refetch();
    configsQuery.refetch();
  };

  if (loading) {
    return (
      <PageContainer
      title="Dashboard"
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
          刷新
        </Button>
      }
    >
        <div className="dashboard-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </PageContainer>
    );
  }

  const apps = appsQuery.data?.data?.items || [];
  const projects = projectsQuery.data?.data?.items || [];
  const logs = logFilesQuery.data?.data?.items || [];
  const configs = configsQuery.data?.data?.items || [];

  const runningApps = apps.filter((a: { id: number }) => {
    const statusData = appsQuery.data?.data?.items;
    // 在列表接口中可能没有 status，这里仅做计数展示
    return true;
  });

  return (
    <PageContainer
      title="Dashboard"
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
          刷新
        </Button>
      }
    >
      <div className="dashboard">
        {/* 统计卡片行 */}
        <Row gutter={[16, 16]} className="dashboard-stats">
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => (window.location.href = '/applications')}>
              <Statistic
                title="Applications"
                value={apps.length}
                prefix={<CodeOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => (window.location.href = '/git/projects')}>
              <Statistic
                title="Git Projects"
                value={projects.length}
                prefix={<BranchesOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => (window.location.href = '/logs')}>
              <Statistic
                title="Log Files"
                value={logs.length}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => (window.location.href = '/configurations')}>
              <Statistic
                title="Configurations"
                value={configs.length}
                prefix={<SettingOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 下方两栏 */}
        <Row gutter={[16, 16]} className="dashboard-detail">
          {/* 应用列表 */}
          <Col xs={24} lg={12}>
            <Card
              title="Applications"
              extra={<a href="/applications">View All →</a>}
            >
              {apps.length === 0 ? (
                <Empty description="暂无应用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                apps.slice(0, 5).map((app: any) => {
                  const statusInfo = getApplicationStatusInfo(app.status || 'STOPPED');
                  return (
                    <div key={app.id} className="dashboard-item">
                      <div className="dashboard-item-info">
                        <Text strong>{app.name}</Text>
                        <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
                          {app.command}
                        </Text>
                      </div>
                      <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                    </div>
                  );
                })
              )}
            </Card>
          </Col>

          {/* Git 项目列表 */}
          <Col xs={24} lg={12}>
            <Card
              title="Git Projects"
              extra={<a href="/git/projects">View All →</a>}
            >
              {projects.length === 0 ? (
                <Empty description="暂无 Git 项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                projects.slice(0, 5).map((proj: any) => (
                  <div key={proj.id} className="dashboard-item">
                    <div className="dashboard-item-info">
                      <Text strong>{proj.name}</Text>
                      <Text type="secondary">{shortenPath(proj.path)}</Text>
                    </div>
                    <Tag>{proj.branch || '-'}</Tag>
                  </div>
                ))
              )}
            </Card>
          </Col>
        </Row>

        {/* 第二行：日志和配置 */}
        <Row gutter={[16, 16]} className="dashboard-detail">
          <Col xs={24} lg={12}>
            <Card
              title="Recent Logs"
              extra={<a href="/logs">View All →</a>}
            >
              {logs.length === 0 ? (
                <Empty description="暂无日志文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                logs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="dashboard-item">
                    <div className="dashboard-item-info">
                      <Text strong>{log.name}</Text>
                      <Text type="secondary">{shortenPath(log.path)}</Text>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Configurations"
              extra={<a href="/configurations">View All →</a>}
            >
              {configs.length === 0 ? (
                <Empty description="暂无配置文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                configs.slice(0, 5).map((cfg: any) => (
                  <div key={cfg.id} className="dashboard-item">
                    <div className="dashboard-item-info">
                      <Text strong>{cfg.name}</Text>
                      <Text type="secondary">{shortenPath(cfg.path)}</Text>
                    </div>
                    {cfg.groupName && <Tag color="blue">{cfg.groupName}</Tag>}
                  </div>
                ))
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
