import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Tag, Spin, Empty, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { workspaceApi } from '@/api/workspaceApi';
import type { IndexStatus } from '@/types/workspace';
import PageContainer from '@/components/PageContainer';

const { Text } = Typography;

const getIndexStatusTag = (status: IndexStatus) => {
  const map: Record<IndexStatus, { label: string; color: string }> = {
    NOT_INDEXED: { label: '未索引', color: 'default' },
    INDEXING: { label: '索引中', color: 'processing' },
    READY: { label: '就绪', color: 'success' },
    FAILED: { label: '失败', color: 'error' },
    OUTDATED: { label: '已过期', color: 'warning' },
  };
  const info = map[status] || { label: status, color: 'default' };
  return <Tag color={info.color}>{info.label}</Tag>;
};

const WorkspaceRag = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const overview = data?.data;

  if (isLoading) return <Spin />;

  return (
    <PageContainer title="Workspace · RAG">
      <Card title="RAG Directories" style={{ marginBottom: 16 }}>
        {overview?.ragDirs.length === 0 ? (
          <Empty description="暂无 RAG 目录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {overview?.ragDirs.map((dir) => (
              <Tag key={dir} icon={<FolderOpenOutlined />} color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                {dir}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      {/* 上下文列表 */}
      <Card title="Project Contexts">
        {!overview?.contexts?.length ? (
          <Empty description="暂无项目上下文" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Text type="secondary">
              Context 由 Git Group 创建时自动生成。RAG 目录用于存放 AI 检索增强生成的文档和知识库。
            </Text>
          </Empty>
        ) : (
          overview.contexts.map((ctx) => (
            <Card key={ctx.id} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={{ xs: 1, sm: 3 }}>
                <Descriptions.Item label="RAG Path">
                  <code>{ctx.ragPath}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Index Status">
                  {getIndexStatusTag(ctx.indexStatus)}
                </Descriptions.Item>
                <Descriptions.Item label="Last Indexed">
                  {ctx.lastIndexedAt ? new Date(ctx.lastIndexedAt).toLocaleString('zh-CN') : '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ))
        )}
      </Card>
    </PageContainer>
  );
};

export default WorkspaceRag;
