import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import {
  Descriptions,
  Button,
  Spin,
  Tag,
  Card,
  Space,
  Typography,
  Form,
  Input,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CloseOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { gitApi } from '@/api/gitApi';
import { getGitStatusInfo } from '@/utils/format';
import { shortenPath } from '@/utils/path';
import PageContainer from '@/components/PageContainer';

const { Title } = Typography;

const GitProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [editingContext, setEditingContext] = useState(false);
  const [contextForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['gitProject', id],
    queryFn: () => gitApi.getProjectById(Number(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      gitApi.updateProject(Number(id), values),
    onSuccess: () => {
      message.success('上下文已更新');
      setEditingContext(false);
      queryClient.invalidateQueries({ queryKey: ['gitProject', id] });
    },
  });

  const handleStartEditContext = () => {
    const project = data?.data;
    if (project) {
      contextForm.setFieldsValue({
        ragPath: project.ragPath || '',
        indexPath: project.indexPath || '',
      });
    }
    setEditingContext(true);
  };

  const handleCancelEditContext = () => {
    setEditingContext(false);
  };

  const handleSaveContext = () => {
    contextForm.validateFields().then((values) => {
      updateMutation.mutate(values);
    });
  };

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
      </PageContainer>
    );
  }

  const project = data?.data;
  if (!project) {
    return (
      <PageContainer title="Not Found">
        <p>项目不存在</p>
        <Button onClick={() => navigate('/git/projects')}>返回列表</Button>
      </PageContainer>
    );
  }

  const statusInfo = getGitStatusInfo(project.status);

  return (
    <PageContainer
      title={project.name}
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/git/projects')}
        >
          返回
        </Button>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Overview */}
        <Card title="Overview">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Name">{project.name}</Descriptions.Item>
            <Descriptions.Item label="Path">
              <code>{project.path}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Branch">
              <Tag>{project.branch || '—'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Remote">
              {project.remote || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Last Commit">
              <code style={{ fontSize: 12 }}>{project.lastCommit || '—'}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Group">
              {project.groupName ? (
                <Tag color="purple">{project.groupName}</Tag>
              ) : (
                '—'
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* AI Context */}
        <Card
          title="AI Context"
          extra={
            editingContext ? (
              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleSaveContext}
                  loading={updateMutation.isPending}
                >
                  保存
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEditContext}
                >
                  取消
                </Button>
              </Space>
            ) : (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={handleStartEditContext}
              >
                编辑
              </Button>
            )
          }
        >
          {editingContext ? (
            <Form form={contextForm} layout="vertical" size="small">
              <Form.Item name="ragPath" label="RAG Path">
                <Input placeholder="RAG 目录路径" />
              </Form.Item>
              <Form.Item name="indexPath" label="Index Path">
                <Input placeholder="Index 目录路径" />
              </Form.Item>
            </Form>
          ) : (
            <>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="RAG Path">
                  {project.ragPath ? <code>{shortenPath(project.ragPath)}</code> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Index Path">
                  {project.indexPath ? <code>{shortenPath(project.indexPath)}</code> : '—'}
                </Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 12, color: '#8c8c8c', fontSize: 13 }}>
                此区域为后续 AI 功能预留。RAG 和 Index 目录服务于项目所在的 Group 级别的代码理解和检索能力。
              </div>
            </>
          )}
        </Card>
      </Space>
    </PageContainer>
  );
};

export default GitProjectDetail;
