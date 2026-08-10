import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Popconfirm,
  App,
  Empty,
  Spin,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { gitApi } from '@/api/gitApi';
import { workspaceApi } from '@/api/workspaceApi';
import type { GitGroup } from '@/types/git';
import { shortenPath } from '@/utils/path';
import PageContainer from '@/components/PageContainer';

const { Text } = Typography;

const GitGroups = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GitGroup | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['gitGroups'],
    queryFn: () => gitApi.listGroups(),
  });

  // 获取所有 context 用于统计每个分组的 context 数量
  const { data: workspaceData } = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const contexts = workspaceData?.data?.contexts || [];
  const contextCountByGroup = contexts.reduce<Record<number, number>>((acc, ctx) => {
    acc[ctx.groupId] = (acc[ctx.groupId] || 0) + 1;
    return acc;
  }, {});

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gitApi.deleteGroup(id),
    onSuccess: () => {
      appMessage.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: any }) =>
      id ? gitApi.updateGroup(id, data) : gitApi.createGroup(data),
    onSuccess: () => {
      appMessage.success(editingGroup ? '修改成功' : '创建成功');
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      setModalOpen(false);
      setEditingGroup(null);
      form.resetFields();
    },
  });

  const handleEdit = (group: GitGroup) => {
    setEditingGroup(group);
    form.setFieldsValue(group);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingGroup(null);
    form.resetFields();
    setModalOpen(true);
  };

  const groups = data?.data?.items || [];

  return (
    <PageContainer
      title="Git Groups"
      extra={
        <Button onClick={() => navigate('/git/projects')}>
          返回项目列表
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : groups.length === 0 ? (
        <Empty description="暂无分组">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建分组
          </Button>
        </Empty>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Group
          </Button>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {groups.map((g) => (
              <Card
                key={g.id}
                hoverable
                title={
                  <a onClick={(e) => { e.stopPropagation(); navigate(`/git/groups/${g.id}`); }}>{g.name}</a>
                }
                extra={
                  <span onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                      title="确认删除此分组？"
                      onConfirm={() => deleteMutation.mutate(g.id)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </span>
                }
                onClick={() => handleEdit(g)}
              >
                <p style={{ color: '#8c8c8c', minHeight: 40 }}>
                  {g.description || '暂无描述'}
                </p>
                <Space direction="vertical" size={4}>
                  <Space size={12}>
                    <Text>
                      <strong>{g.projectCount}</strong> 个项目
                    </Text>
                    <Text>
                      <strong>{contextCountByGroup[g.id] || 0}</strong> 个 Context
                    </Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FolderOpenOutlined /> RAG: {shortenPath(g.ragPath) || '—'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FolderOpenOutlined /> Index: {shortenPath(g.indexPath) || '—'}
                  </Text>
                </Space>
              </Card>
            ))}
          </div>
        </Space>
      )}

      <Modal
        title={editingGroup ? '编辑分组' : '创建分组'}
        open={modalOpen}
        onOk={() => form.validateFields().then((v) => saveMutation.mutate({ id: editingGroup?.id, data: v }))}
        onCancel={() => { setModalOpen(false); setEditingGroup(null); form.resetFields(); }}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Frontend" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="可选描述" />
          </Form.Item>
          <Form.Item name="ragPath" label="RAG Path">
            <Input placeholder="默认自动生成" />
          </Form.Item>
          <Form.Item name="indexPath" label="Index Path">
            <Input placeholder="默认自动生成" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default GitGroups;
