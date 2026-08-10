import './git.less';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Skeleton,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  gitApi,
  fetchProjectStatuses,
  isProjectStatusBatchAvailable,
} from '@/api/gitApi';
import { ApiRequestError } from '@/api/client';
import type { GitProjectListItem } from '@/types/git';
import type { ProjectContext } from '@/types/workspace';
import {
  PageContainer,
  DataTable,
  StatusTag,
  PathText,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ConfirmButton,
  TimeText,
} from '@/components';
import type { DataTableColumn } from '@/components';
import ContextDocsModal from './ContextDocsModal';

type StatusMap = Record<number, { status: string; loading?: boolean }>;

const GitGroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const groupId = Number(id);
  const isValidId =
    Number.isFinite(groupId) && groupId > 0 && String(groupId) === String(id);

  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<ProjectContext | null>(null);
  const [contextForm] = Form.useForm();

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docContext, setDocContext] = useState<ProjectContext | null>(null);

  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [statusColumnEnabled, setStatusColumnEnabled] = useState(true);

  const {
    data: groupData,
    isLoading,
    isFetching: groupFetching,
    isError: groupIsError,
    error: groupError,
    refetch: refetchGroup,
  } = useQuery({
    queryKey: ['gitGroup', groupId],
    queryFn: () => gitApi.getGroupById(groupId, { silent: true }),
    enabled: isValidId,
    retry: false,
  });

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['gitGroupProjects', groupId],
    queryFn: () => gitApi.listProjectsByGroup(groupId),
    enabled: isValidId,
  });

  const {
    data: contextsData,
    isLoading: contextsLoading,
    isFetching: contextsFetching,
    refetch: refetchContexts,
  } = useQuery({
    queryKey: ['gitContexts', groupId],
    queryFn: () => gitApi.listContexts(groupId),
    enabled: isValidId,
  });

  // Stabilize empty fallback — unstable [] would re-fire the status enrichment effect every render
  const groupProjects: GitProjectListItem[] = useMemo(
    () => projectsData?.data?.items ?? [],
    [projectsData?.data?.items],
  );
  const contexts: ProjectContext[] = useMemo(
    () => contextsData?.data?.items ?? [],
    [contextsData?.data?.items],
  );

  useEffect(() => {
    let cancelled = false;
    const ids = groupProjects.map((p) => p.id);
    if (ids.length === 0) return;

    const alreadyEnriched = groupProjects.every(
      (p) => p.status != null && p.status !== '',
    );
    if (alreadyEnriched) {
      const map: StatusMap = {};
      for (const p of groupProjects) {
        if (p.status) map[p.id] = { status: p.status };
      }
      setStatusMap(map);
      setStatusColumnEnabled(true);
      return;
    }

    (async () => {
      const available = await isProjectStatusBatchAvailable();
      if (cancelled) return;
      if (!available) {
        setStatusColumnEnabled(false);
        setStatusMap({});
        return;
      }
      setStatusColumnEnabled(true);
      setStatusMap((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          if (!next[id]?.status) next[id] = { status: '', loading: true };
        }
        return next;
      });
      try {
        const result = await fetchProjectStatuses(ids);
        if (cancelled) return;
        if (result == null) {
          setStatusColumnEnabled(false);
          setStatusMap({});
          return;
        }
        const map: StatusMap = {};
        for (const row of result) {
          map[row.id] = { status: row.status, loading: false };
        }
        for (const id of ids) {
          if (!map[id]) map[id] = { status: 'UNKNOWN', loading: false };
        }
        setStatusMap(map);
      } catch {
        if (!cancelled) {
          setStatusMap((prev) => {
            const next = { ...prev };
            for (const id of ids) {
              next[id] = { status: 'UNKNOWN', loading: false };
            }
            return next;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupProjects]);

  const createContextMutation = useMutation({
    mutationFn: (values: { name: string }) => gitApi.createContext(groupId, values),
    onSuccess: () => {
      message.success('Context created');
      queryClient.invalidateQueries({ queryKey: ['gitContexts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setContextModalOpen(false);
      contextForm.resetFields();
    },
  });

  const updateContextMutation = useMutation({
    mutationFn: ({
      contextId,
      values,
    }: {
      contextId: number;
      values: { name?: string; ragPath?: string; indexPath?: string };
    }) => gitApi.updateContext(groupId, contextId, values),
    onSuccess: () => {
      message.success('Context updated');
      queryClient.invalidateQueries({ queryKey: ['gitContexts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setContextModalOpen(false);
      setEditingContext(null);
      contextForm.resetFields();
    },
  });

  const deleteContextMutation = useMutation({
    mutationFn: (contextId: number) => gitApi.deleteContext(groupId, contextId),
    onSuccess: () => {
      message.success('Context deleted');
      queryClient.invalidateQueries({ queryKey: ['gitContexts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });

  const notFound = useMemo(() => {
    if (!isValidId) return true;
    if (!groupIsError) return false;
    return (
      groupError instanceof ApiRequestError &&
      (groupError.status === 404 ||
        groupError.code === 'NOT_FOUND' ||
        groupError.code === 'GROUP_NOT_FOUND')
    );
  }, [isValidId, groupIsError, groupError]);

  if (!isValidId || notFound) {
    return (
      <PageContainer
        title="Group not found"
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            className="ldw-clickable"
            onClick={() => navigate('/git/groups')}
          >
            Back to Groups
          </Button>
        }
      >
        <EmptyState
          preset="search"
          title="Group not found"
          description={
            isValidId
              ? `No group with id ${id} exists.`
              : `"${id}" is not a valid group id.`
          }
          action={{
            text: 'Back to Groups',
            onClick: () => navigate('/git/groups'),
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

  if (groupIsError) {
    return (
      <PageContainer title="Group">
        <ErrorState error={groupError as Error} onRetry={() => refetchGroup()} />
      </PageContainer>
    );
  }

  const group = groupData?.data;
  if (!group) {
    return (
      <PageContainer title="Group not found">
        <EmptyState
          preset="search"
          title="Group not found"
          action={{
            text: 'Back to Groups',
            onClick: () => navigate('/git/groups'),
          }}
        />
      </PageContainer>
    );
  }

  const handleRefresh = () => {
    refetchGroup();
    refetchProjects();
    refetchContexts();
  };

  const handleOpenDocs = (ctx: ProjectContext) => {
    setDocContext(ctx);
    setDocModalOpen(true);
  };

  const projectColumns: DataTableColumn<GitProjectListItem>[] = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      render: (_: unknown, r) => (
        <Link to={`/git/projects/${r.id}`} className="ldw-clickable">
          {r.name}
        </Link>
      ),
    },
    {
      key: 'path',
      title: 'Path',
      dataIndex: 'path',
      ellipsis: true,
      render: (_: unknown, r) => <PathText path={r.path} />,
    },
    {
      key: 'branch',
      title: 'Branch',
      dataIndex: 'branch',
      width: 120,
      render: (b: unknown) => (b ? <Tag>{String(b)}</Tag> : <Tag>—</Tag>),
    },
    ...(statusColumnEnabled
      ? [
          {
            key: 'status',
            title: 'Status',
            width: 120,
            render: (_: unknown, record: GitProjectListItem) => {
              const entry = statusMap[record.id];
              if (!entry || entry.loading || !entry.status) {
                return (
                  <Skeleton.Button active size="small" style={{ width: 64, height: 22 }} />
                );
              }
              return <StatusTag status={entry.status} kind="git" />;
            },
          } satisfies DataTableColumn<GitProjectListItem>,
        ]
      : [
          {
            key: 'status',
            title: 'Status',
            width: 100,
            render: () => (
              <span style={{ color: 'var(--ldw-text-secondary)', fontSize: 12 }}>N/A</span>
            ),
          } satisfies DataTableColumn<GitProjectListItem>,
        ]),
    {
      key: 'action',
      title: 'Action',
      width: 90,
      render: (_: unknown, r) => (
        <Button
          size="small"
          type="link"
          className="ldw-clickable"
          onClick={() => navigate(`/git/projects/${r.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const contextColumns: DataTableColumn<ProjectContext>[] = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      render: (n: unknown) => (n ? String(n) : <Tag>Unnamed</Tag>),
    },
    {
      key: 'ragPath',
      title: 'RAG Path',
      dataIndex: 'ragPath',
      ellipsis: true,
      render: (_: unknown, ctx) =>
        ctx.ragPath ? <PathText path={ctx.ragPath} /> : '—',
    },
    {
      key: 'indexPath',
      title: 'Index Path',
      dataIndex: 'indexPath',
      ellipsis: true,
      render: (_: unknown, ctx) =>
        ctx.indexPath ? <PathText path={ctx.indexPath} /> : '—',
    },
    {
      key: 'indexStatus',
      title: 'Status',
      dataIndex: 'indexStatus',
      width: 130,
      render: (_: unknown, ctx) => (
        <StatusTag status={ctx.indexStatus || 'NOT_INDEXED'} kind="index" />
      ),
    },
    {
      key: 'lastIndexedAt',
      title: 'Last Indexed',
      dataIndex: 'lastIndexedAt',
      width: 140,
      render: (_: unknown, ctx) => <TimeText value={ctx.lastIndexedAt} />,
    },
    {
      key: 'action',
      title: 'Action',
      width: 200,
      render: (_: unknown, ctx) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            className="ldw-clickable"
            onClick={() => handleOpenDocs(ctx)}
          >
            Docs
          </Button>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            className="ldw-clickable"
            aria-label={`Edit ${ctx.name}`}
            title="Edit"
            onClick={() => {
              setEditingContext(ctx);
              contextForm.setFieldsValue({
                name: ctx.name || '',
                ragPath: ctx.ragPath,
                indexPath: ctx.indexPath,
              });
              setContextModalOpen(true);
            }}
          />
          <ConfirmButton
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            confirmTitle="Delete this context?"
            confirmDescription="Associated documents under this context may become unreachable."
            okText="Delete"
            aria-label={`Delete ${ctx.name}`}
            onConfirm={async () => {
              await deleteContextMutation.mutateAsync(ctx.id);
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={group.name}
      subTitle={group.description || undefined}
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            className="ldw-clickable"
            onClick={handleRefresh}
            loading={groupFetching || projectsFetching || contextsFetching}
            aria-label="Refresh"
            title="Refresh"
          />
          <Button
            icon={<ArrowLeftOutlined />}
            className="ldw-clickable"
            onClick={() => navigate('/git/groups')}
          >
            Back
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" className="git-detail-stack">
        <Card title="Group Info" size="small">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Name">{group.name}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {group.description || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Projects">
              <Tag color="blue">{group.projectCount}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Contexts">
              <Tag color="cyan">{contexts.length}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="RAG Path">
              {group.ragPath ? <PathText path={group.ragPath} /> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Index Path">
              {group.indexPath ? <PathText path={group.indexPath} /> : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          size="small"
          title={`AI Contexts (${contexts.length})`}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              className="ldw-clickable"
              onClick={() => {
                setEditingContext(null);
                contextForm.resetFields();
                setContextModalOpen(true);
              }}
            >
              Add Context
            </Button>
          }
        >
          {contexts.length === 0 && !contextsLoading ? (
            <EmptyState
              title="No contexts"
              description="Contexts define code directories for AI understanding and retrieval."
              action={{
                text: 'Add Context',
                icon: <PlusOutlined />,
                onClick: () => {
                  setEditingContext(null);
                  contextForm.resetFields();
                  setContextModalOpen(true);
                },
              }}
            />
          ) : (
            <DataTable<ProjectContext>
              rowKey="id"
              loading={contextsLoading}
              dataSource={contexts}
              columns={contextColumns}
              pagination={false}
              showColumnSettings={false}
              searchable={false}
              onRefresh={() => refetchContexts()}
              emptyTitle="No contexts"
              scroll={{ x: 800 }}
            />
          )}
        </Card>

        <Card size="small" title={`Projects (${groupProjects.length})`}>
          {groupProjects.length === 0 && !projectsLoading ? (
            <EmptyState
              title="No projects in this group"
              description="Assign projects from the Projects page."
              action={{
                text: 'Go to Projects',
                onClick: () => navigate('/git/projects'),
              }}
            />
          ) : (
            <DataTable<GitProjectListItem>
              rowKey="id"
              loading={projectsLoading}
              dataSource={groupProjects}
              columns={projectColumns}
              pagination={false}
              showColumnSettings={false}
              searchable={false}
              onRefresh={() => refetchProjects()}
              emptyTitle="No projects"
              scroll={{ x: 720 }}
            />
          )}
        </Card>
      </Space>

      <Modal
        title={editingContext ? 'Edit Context' : 'Add Context'}
        open={contextModalOpen}
        onOk={() => {
          contextForm.validateFields().then((values) => {
            if (editingContext) {
              updateContextMutation.mutate({
                contextId: editingContext.id,
                values,
              });
            } else {
              createContextMutation.mutate({ name: values.name });
            }
          });
        }}
        onCancel={() => {
          setContextModalOpen(false);
          setEditingContext(null);
          contextForm.resetFields();
        }}
        confirmLoading={
          createContextMutation.isPending || updateContextMutation.isPending
        }
        width={560}
        destroyOnHidden
        okText={editingContext ? 'Save' : 'Create'}
      >
        <Form form={contextForm} layout="vertical" className="git-form-gap">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Context name is required' }]}
            extra={
              editingContext
                ? undefined
                : 'Directories are created under the group RAG / Index paths using this name.'
            }
          >
            <Input placeholder="e.g. deployment" />
          </Form.Item>
          {editingContext && (
            <>
              <Form.Item
                name="ragPath"
                label="RAG Path"
                rules={[{ required: true, message: 'RAG path is required' }]}
              >
                <Input placeholder="/workspace/rag/frontend" />
              </Form.Item>
              <Form.Item
                name="indexPath"
                label="Index Path"
                rules={[{ required: true, message: 'Index path is required' }]}
              >
                <Input placeholder="/workspace/index/frontend" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <ContextDocsModal
        open={docModalOpen}
        context={docContext}
        onClose={() => {
          setDocModalOpen(false);
          setDocContext(null);
        }}
      />
    </PageContainer>
  );
};

export default GitGroupDetail;
