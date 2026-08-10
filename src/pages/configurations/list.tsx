import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  App,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router';
import { configApi } from '@/api/configApi';
import type { ConfigFileItem, CreateConfigRequest } from '@/types/config';
import { shortenPath } from '@/utils/path';
import { formatTimeAgo } from '@/utils/format';
import PageContainer from '@/components/PageContainer';
import './index.less';

const ConfigList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateConfigRequest>();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['configFiles'],
    queryFn: () => configApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => configApi.delete(id),
    onSuccess: () => {
      appMessage.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['configFiles'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateConfigRequest) => configApi.create(data),
    onSuccess: () => {
      appMessage.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['configFiles'] });
      setModalOpen(false);
      form.resetFields();
    },
  });

  const handleCreate = () => {
    form.validateFields().then((values) => {
      createMutation.mutate(values);
    });
  };

  const columns: ColumnsType<ConfigFileItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ConfigFileItem) => (
        <a onClick={() => navigate(`/configurations/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => (
        <code style={{ fontSize: 12 }}>{shortenPath(path)}</code>
      ),
    },
    {
      title: 'Group',
      dataIndex: 'groupName',
      key: 'groupName',
      render: (name: string) =>
        name ? <Tag color="blue">{name}</Tag> : <Tag>—</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '—',
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (val: string) => formatTimeAgo(val),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ConfigFileItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/configurations/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="只删除记录，不会删除本地文件"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const items = data?.data?.items || [];

  return (
    <PageContainer
      title="Configurations"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Add Config
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onDoubleClick: () => navigate(`/configurations/${record.id}`),
        })}
      />

      <Modal
        title="Add Configuration"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="e.g. Claude Config" />
          </Form.Item>
          <Form.Item
            name="path"
            label="Path"
            rules={[{ required: true, message: '请输入文件路径' }]}
            help="支持 ~/、$HOME、绝对路径"
          >
            <Input placeholder="e.g. ~/.claude/settings.json" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="可选描述" />
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
