import './git.less';

import { useMemo, useState, type MouseEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { gitApi } from '@/api/gitApi';
import type { GitGroup } from '@/types/git';
import {
  PageContainer,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PathText,
  ConfirmButton,
} from '@/components';

const { Text } = Typography;

const GitGroups = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQ = searchParams.get('q') ?? '';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GitGroup | null>(null);
  const [form] = Form.useForm();

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['gitGroups'],
    queryFn: () => gitApi.listGroups(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gitApi.deleteGroup(id),
    onSuccess: () => {
      appMessage.success('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Record<string, unknown> }) =>
      id ? gitApi.updateGroup(id, data) : gitApi.createGroup(data as { name: string }),
    onSuccess: (_res, variables) => {
      appMessage.success(variables.id ? 'Group updated' : 'Group created');
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['gitGroup', String(variables.id)] });
        queryClient.invalidateQueries({ queryKey: ['gitGroup', variables.id] });
      }
      setModalOpen(false);
      setEditingGroup(null);
      form.resetFields();
    },
  });

  const setSearch = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  };

  const handleEdit = (e: MouseEvent, group: GitGroup) => {
    e.stopPropagation();
    setEditingGroup(group);
    form.setFieldsValue(group);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingGroup(null);
    form.resetFields();
    setModalOpen(true);
  };

  // Stabilize empty fallback — otherwise filtered useMemo recomputes every render while loading
  const groups = useMemo(
    () => data?.data?.items ?? [],
    [data?.data?.items],
  );
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q),
    );
  }, [groups, searchQ]);

  if (isError) {
    return (
      <PageContainer title="Git Groups">
        <ErrorState error={error as Error} onRetry={() => refetchGroups()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Git Groups"
      subTitle="Organize repositories and AI contexts"
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            className="ldw-clickable"
            onClick={() => refetchGroups()}
            loading={isFetching}
            aria-label="Refresh"
            title="Refresh"
          />
          <Link to="/git/projects">
            <Button className="ldw-clickable">Back to Projects</Button>
          </Link>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="ldw-clickable"
            onClick={handleCreate}
          >
            Create Group
          </Button>
        </Space>
      }
    >
      <div className="git-groups-toolbar">
        <Input.Search
          allowClear
          placeholder="Search groups…"
          value={searchQ}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={setSearch}
          className="git-groups-toolbar__search"
          aria-label="Search groups"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="cards" cards={4} />
      ) : groups.length === 0 ? (
        <EmptyState
          preset="folder"
          title="No groups yet"
          description="Create a group to organize projects and AI contexts."
          action={{
            text: 'Create Group',
            icon: <PlusOutlined />,
            onClick: handleCreate,
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          preset="search"
          title="No matching groups"
          description="Try a different search term."
          action={{ text: 'Clear search', onClick: () => setSearch('') }}
        />
      ) : (
        <div className="git-card-grid">
          {filtered.map((g) => (
            <Card
              key={g.id}
              hoverable
              className="git-group-card ldw-clickable"
              role="link"
              tabIndex={0}
              aria-label={`Open group ${g.name}`}
              onClick={() => navigate(`/git/groups/${g.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/git/groups/${g.id}`);
                }
              }}
              title={<span className="git-group-card__title">{g.name}</span>}
              extra={
                <Space
                  size={4}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    className="ldw-clickable"
                    aria-label={`Edit ${g.name}`}
                    title="Edit"
                    onClick={(e) => handleEdit(e, g)}
                  />
                  <ConfirmButton
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    confirmTitle="Delete this group?"
                    confirmDescription="Projects stay registered; only the group is removed."
                    okText="Delete"
                    aria-label={`Delete ${g.name}`}
                    onConfirm={async () => {
                      await deleteMutation.mutateAsync(g.id);
                    }}
                  />
                </Space>
              }
            >
              <p className="git-group-card__desc">
                {g.description || 'No description'}
              </p>
              <Space direction="vertical" size={4} className="git-group-card__meta">
                <Space size={16} wrap>
                  <Text>
                    <strong>{g.projectCount}</strong> projects
                  </Text>
                  <Text>
                    <strong>{g.contextCount ?? 0}</strong> contexts
                  </Text>
                </Space>
                <Text type="secondary" className="git-group-card__path">
                  <FolderOpenOutlined aria-hidden /> RAG:{' '}
                  {g.ragPath ? <PathText path={g.ragPath} /> : '—'}
                </Text>
                <Text type="secondary" className="git-group-card__path">
                  <FolderOpenOutlined aria-hidden /> Index:{' '}
                  {g.indexPath ? <PathText path={g.indexPath} /> : '—'}
                </Text>
              </Space>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={editingGroup ? 'Edit Group' : 'Create Group'}
        open={modalOpen}
        onOk={() =>
          form.validateFields().then((v) =>
            saveMutation.mutate({ id: editingGroup?.id, data: v }),
          )
        }
        onCancel={() => {
          setModalOpen(false);
          setEditingGroup(null);
          form.resetFields();
        }}
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
        okText={editingGroup ? 'Save' : 'Create'}
      >
        <Form form={form} layout="vertical" className="git-form-gap">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Frontend" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="ragPath" label="RAG Path">
            <Input placeholder="Auto-generated if empty" />
          </Form.Item>
          <Form.Item name="indexPath" label="Index Path">
            <Input placeholder="Auto-generated if empty" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default GitGroups;
