import { useQuery } from '@tanstack/react-query';
import { Button, Card, Tag, Spin, Empty, Typography, Table } from 'antd';
import { FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { workspaceApi } from '@/api/workspaceApi';
import type { ProjectContext } from '@/types/workspace';
import { shortenPath } from '@/utils/path';
import PageContainer from '@/components/PageContainer';

const { Text } = Typography;

const indexStatusColor: Record<string, string> = {
  NOT_INDEXED: 'default',
  INDEXING: 'processing',
  READY: 'green',
  FAILED: 'red',
  OUTDATED: 'orange',
};

const contextColumns: ColumnsType<ProjectContext> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (n: string) => n || <Tag>未命名</Tag>,
  },
  {
    title: 'Group ID',
    dataIndex: 'groupId',
    key: 'groupId',
    width: 90,
  },
  {
    title: 'RAG Path',
    dataIndex: 'ragPath',
    key: 'ragPath',
    render: (p: string) => <code style={{ fontSize: 12 }}>{shortenPath(p)}</code>,
  },
  {
    title: 'Index Path',
    dataIndex: 'indexPath',
    key: 'indexPath',
    render: (p: string) => <code style={{ fontSize: 12 }}>{shortenPath(p)}</code>,
  },
  {
    title: 'Index Status',
    dataIndex: 'indexStatus',
    key: 'indexStatus',
    width: 120,
    render: (s: string) => <Tag color={indexStatusColor[s] || 'default'}>{s}</Tag>,
  },
];

const WorkspaceIndex = () => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const overview = data?.data;

  if (isLoading) return <Spin />;

  return (
    <PageContainer
      title="Workspace · Index"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
          刷新
        </Button>
      }
    >
      <Card title="Index Directories" style={{ marginBottom: 16 }}>
        {!overview?.indexDirs.length ? (
          <Empty description="暂无 Index 目录" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Text type="secondary">
              Index 目录用于存放代码索引数据，为后续 AI 代码理解和搜索功能提供基础。
            </Text>
          </Empty>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {overview?.indexDirs.map((dir) => (
              <Tag key={dir} icon={<FolderOpenOutlined />} color="purple" style={{ fontSize: 14, padding: '4px 12px' }}>
                {dir}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Project Contexts (${overview?.contexts?.length || 0})`} style={{ marginBottom: 16 }}>
        {!overview?.contexts?.length ? (
          <Empty description="暂无 Context" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Text type="secondary">
              Context 定义了各分组的 RAG 和 Index 路径，AI 通过 Context 来读取和理解项目代码。
            </Text>
          </Empty>
        ) : (
          <Table
            columns={contextColumns}
            dataSource={overview.contexts}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Card>

      <Card title="Workspace Root">
        <Text>
          Root: <code>{overview?.root || '—'}</code>
        </Text>
      </Card>
    </PageContainer>
  );
};

export default WorkspaceIndex;
