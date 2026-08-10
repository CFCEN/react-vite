import './git.less';

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router';
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CloseOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { gitApi } from '@/api/gitApi';
import { ApiRequestError } from '@/api/client';
import { formatGitLastCommit } from '@/types/git';
import {
  PageContainer,
  StatusTag,
  PathText,
  CopyableText,
  EmptyState,
  LoadingSkeleton,
  ErrorState,
} from '@/components';

const { Text } = Typography;

const GitProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [editingContext, setEditingContext] = useState(false);
  const [contextForm] = Form.useForm();

  const projectId = Number(id);
  const isValidId = Number.isFinite(projectId) && projectId > 0 && String(projectId) === String(id);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['gitProject', projectId],
    queryFn: () => gitApi.getProjectById(projectId, { silent: true }),
    enabled: isValidId,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      gitApi.updateProject(projectId, values),
    onSuccess: () => {
      message.success('AI context updated');
      setEditingContext(false);
      queryClient.invalidateQueries({ queryKey: ['gitProject', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
    },
  });

  const notFound = useMemo(() => {
    if (!isValidId) return true;
    if (!isError) return false;
    return (
      error instanceof ApiRequestError &&
      (error.status === 404 ||
        error.code === 'NOT_FOUND' ||
        error.code === 'GIT_PROJECT_NOT_FOUND')
    );
  }, [isValidId, isError, error]);

  if (!isValidId || notFound) {
    return (
      <PageContainer
        title="Project not found"
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            className="ldw-clickable"
            onClick={() => navigate('/git/projects')}
          >
            Back to Projects
          </Button>
        }
      >
        <EmptyState
          preset="search"
          title="Project not found"
          description={
            isValidId
              ? `No project with id ${id} exists in the registry.`
              : `"${id}" is not a valid project id.`
          }
          action={{
            text: 'Back to Projects',
            onClick: () => navigate('/git/projects'),
          }}
        />
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer title="Loading…">
        <LoadingSkeleton variant="detail" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer
        title="Project"
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            className="ldw-clickable"
            onClick={() => navigate('/git/projects')}
          >
            Back
          </Button>
        }
      >
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const project = data?.data;
  if (!project) {
    return (
      <PageContainer title="Project not found">
        <EmptyState
          preset="search"
          title="Project not found"
          action={{
            text: 'Back to Projects',
            onClick: () => navigate('/git/projects'),
          }}
        />
      </PageContainer>
    );
  }

  const lastCommitText = formatGitLastCommit(project.lastCommit);

  const handleStartEditContext = () => {
    contextForm.setFieldsValue({
      ragPath: project.ragPath || '',
      indexPath: project.indexPath || '',
    });
    setEditingContext(true);
  };

  return (
    <PageContainer
      title={project.name}
      subTitle={
        project.groupName ? (
          <Link to={`/git/groups/${project.groupId}`} className="ldw-clickable">
            {project.groupName}
          </Link>
        ) : (
          'Ungrouped'
        )
      }
      extra={
        <Space wrap>
          <TooltipButton
            title="Refresh"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          />
          <Button
            icon={<ArrowLeftOutlined />}
            className="ldw-clickable"
            onClick={() => navigate('/git/projects')}
          >
            Back
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" className="git-detail-stack">
        <Card title="Overview" size="small">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Name">{project.name}</Descriptions.Item>
            <Descriptions.Item label="Path">
              <PathText path={project.path} />
            </Descriptions.Item>
            <Descriptions.Item label="Branch">
              {project.branch ? <Tag>{project.branch}</Tag> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Remote">
              {project.remote ? (
                <CopyableText text={project.remote} ellipsis mono />
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag status={project.status || 'UNKNOWN'} kind="git" />
            </Descriptions.Item>
            <Descriptions.Item label="Last Commit">
              {lastCommitText ? (
                <CopyableText text={lastCommitText} ellipsis mono />
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Group">
              {project.groupName ? (
                <Link
                  to={`/git/groups/${project.groupId}`}
                  className="ldw-clickable"
                >
                  <Tag color="cyan">{project.groupName}</Tag>
                </Link>
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="ID">
              <CopyableText text={String(project.id)} mono />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          size="small"
          title="AI Context"
          extra={
            editingContext ? (
              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  className="ldw-clickable"
                  onClick={() =>
                    contextForm.validateFields().then((values) => {
                      updateMutation.mutate(values);
                    })
                  }
                  loading={updateMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  className="ldw-clickable"
                  onClick={() => setEditingContext(false)}
                >
                  Cancel
                </Button>
              </Space>
            ) : (
              <Button
                size="small"
                icon={<EditOutlined />}
                className="ldw-clickable"
                onClick={handleStartEditContext}
              >
                Edit
              </Button>
            )
          }
        >
          {editingContext ? (
            <Form form={contextForm} layout="vertical" size="small">
              <Form.Item name="ragPath" label="RAG Path">
                <Input placeholder="RAG directory path" />
              </Form.Item>
              <Form.Item name="indexPath" label="Index Path">
                <Input placeholder="Index directory path" />
              </Form.Item>
            </Form>
          ) : (
            <>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="RAG Path">
                  {project.ragPath ? <PathText path={project.ragPath} /> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Index Path">
                  {project.indexPath ? (
                    <PathText path={project.indexPath} />
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
              </Descriptions>
              <Text type="secondary" className="git-detail-hint">
                Reserved for AI features. RAG / Index directories are typically
                managed at the group level.
              </Text>
            </>
          )}
        </Card>
      </Space>
    </PageContainer>
  );
};

function TooltipButton({
  title,
  icon,
  onClick,
  loading,
}: {
  title: string;
  icon: ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button
      icon={icon}
      className="ldw-clickable"
      onClick={onClick}
      loading={loading}
      aria-label={title}
      title={title}
    />
  );
}

export default GitProjectDetail;
