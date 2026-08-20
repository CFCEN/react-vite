import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Space, Tag, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { configApi } from '@/api/configApi';
import type { ConfigFileItem, CreateConfigRequest } from '@/types/config';
import {
  PageContainer,
  DataTable,
  PathText,
  TimeText,
  ConfirmButton,
} from '@/components';
import type { DataTableColumn } from '@/components';
import './index.less';

const ConfigList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateConfigRequest>();

  const q = searchParams.get('q') ?? '';

  const listQuery = useQuery({
    queryKey: ['configFiles'],
    queryFn: () => configApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => configApi.delete(id),
    onSuccess: () => {
      appMessage.success('Configuration removed');
      queryClient.invalidateQueries({ queryKey: ['configFiles'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateConfigRequest) => configApi.create(data),
    onSuccess: (res) => {
      appMessage.success('Configuration added');
      queryClient.invalidateQueries({ queryKey: ['configFiles'] });
      setModalOpen(false);
      form.resetFields();
      const createdId = res.data?.id;
      if (createdId) navigate(`/configurations/${createdId}`);
    },
  });

  // Stabilize empty fallback — otherwise filtered useMemo recomputes every render while loading
  const allItems = useMemo(
    () => listQuery.data?.data?.items ?? [],
    [listQuery.data?.data?.items],
  );

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return allItems;
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.path.toLowerCase().includes(search) ||
        (item.groupName ?? '').toLowerCase().includes(search) ||
        (item.description ?? '').toLowerCase().includes(search),
    );
  }, [allItems, q]);

  const setSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const openCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const columns: DataTableColumn<ConfigFileItem>[] = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      render: (_value, record) => (
        <Button
          type="link"
          className="ldw-clickable"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => navigate(`/configurations/${record.id}`)}
        >
          {record.name}
        </Button>
      ),
    },
    {
      key: 'path',
      title: 'Path',
      dataIndex: 'path',
      ellipsis: true,
      render: (_value, record) => <PathText path={record.path} />,
    },
    {
      key: 'groupName',
      title: 'Group',
      width: 120,
      render: (_value, record) =>
        record.groupName ? <Tag color="blue">{record.groupName}</Tag> : <Tag>—</Tag>,
    },
    {
      key: 'description',
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (value) => (value as string) || '—',
    },
    {
      key: 'updatedAt',
      title: 'Updated',
      dataIndex: 'updatedAt',
      width: 140,
      render: (value) => <TimeText value={value as string} />,
    },
    {
      key: 'action',
      title: 'Action',
      width: 150,
      locked: true,
      render: (_value, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            className="ldw-clickable"
            aria-label={`Edit ${record.name}`}
            title="Edit"
            onClick={() => navigate(`/configurations/${record.id}`)}
          >
            Edit
          </Button>
          <ConfirmButton
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Delete ${record.name}`}
            title="Delete"
            confirmTitle="Delete this configuration?"
            confirmDescription="Only removes the registry record. The file on disk is not deleted."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => deleteMutation.mutateAsync(record.id)}
          >
            Delete
          </ConfirmButton>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Configurations"
      subTitle="Edit local config files in place"
      loading={listQuery.isLoading}
      loadingVariant="table"
      error={listQuery.isError ? (listQuery.error as Error) : null}
      onRetry={() => listQuery.refetch()}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="ldw-clickable"
          onClick={openCreate}
        >
          Add Config
        </Button>
      }
    >
      <DataTable
        rowKey="id"
        dataSource={filtered}
        columns={columns}
        loading={listQuery.isFetching && !listQuery.isLoading}
        searchable
        searchPlaceholder="Search name, path, group…"
        searchValue={q}
        onSearch={setSearch}
        onRefresh={() => listQuery.refetch()}
        emptyTitle={q ? 'No matching configurations' : 'No configurations'}
        emptyDescription={
          q
            ? 'Try a different search term.'
            : 'Add a config file path to start editing.'
        }
        emptyAction={
          q ? undefined : { text: 'Add Config', onClick: openCreate }
        }
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} configs`,
        }}
      />

      <Modal
        title="Add Configuration"
        open={modalOpen}
        onOk={() => form.validateFields().then((values) => createMutation.mutate(values))}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
        okText="Add"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Claude Config" />
          </Form.Item>
          <Form.Item
            name="path"
            label="Path"
            rules={[{ required: true, message: 'Path is required' }]}
            help="Supports ~/, $HOME, and absolute paths"
          >
            <Input placeholder="e.g. ~/.claude/settings.json" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="groupName" label="Group Name">
            <Input placeholder="e.g. AI, Frontend" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ConfigList;
