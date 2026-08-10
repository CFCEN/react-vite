import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Popconfirm,
  App,
  Modal,
  Select,
  Tabs,
  Card,
  Empty,
  Typography,
} from 'antd';
import {
  ScanOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router';
import { gitApi } from '@/api/gitApi';
import type { GitProjectItem, GitGroup } from '@/types/git';
import { getGitStatusInfo } from '@/utils/format';
import { shortenPath } from '@/utils/path';
import PageContainer from '@/components/PageContainer';

const { Text } = Typography;

const GitProjects = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: appMessage } = App.useApp();

  // scan
  const [scanPath, setScanPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(5);

  // selection & group modal
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectGroupId, setSelectGroupId] = useState<number | undefined>();

  // tabs
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedGroup, setSelectedGroup] = useState<GitGroup | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['gitProjects'],
    queryFn: () => gitApi.listProjects(),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['gitGroups'],
    queryFn: () => gitApi.listGroups(),
  });

  // 按分组查询项目（选中分组时触发）
  const { data: groupProjectsData, isLoading: groupProjectsLoading } = useQuery({
    queryKey: ['gitGroupProjects', selectedGroup?.id],
    queryFn: () => gitApi.listProjectsByGroup(selectedGroup!.id),
    enabled: !!selectedGroup,
  });

  const scanMutation = useMutation({
    mutationFn: () => gitApi.scan({ path: scanPath, maxDepth }),
    onSuccess: (res: any) => {
      appMessage.success(`扫描完成，发现 ${res.data?.items?.length || 0} 个项目`);
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gitApi.deleteProject(id),
    onSuccess: () => {
      appMessage.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
    },
  });

  const assignGroupMutation = useMutation({
    mutationFn: ({ projectIds, groupId }: { projectIds: number[]; groupId: number }) =>
      gitApi.batchAssignGroup({ projectIds, groupId }),
    onSuccess: (_res, variables) => {
      const count = variables.projectIds.length;
      appMessage.success(count > 1 ? `已将 ${count} 个项目加入分组` : '已加入分组');
      queryClient.invalidateQueries({ queryKey: ['gitProjects'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroupProjects'] });
      setGroupModalOpen(false);
      setSelectedRowKeys([]);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => gitApi.deleteGroup(id),
    onSuccess: () => {
      appMessage.success('分组已删除');
      queryClient.invalidateQueries({ queryKey: ['gitGroups'] });
      queryClient.invalidateQueries({ queryKey: ['gitGroupProjects'] });
      setSelectedGroup(null);
    },
  });

  const handleScan = () => {
    if (!scanPath.trim()) {
      appMessage.warning('请输入扫描路径');
      return;
    }
    scanMutation.mutate();
  };

  const openGroupModal = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
    setSelectGroupId(undefined);
    setGroupModalOpen(true);
  };

  const groups: GitGroup[] = groupsData?.data?.items || [];
  const items: GitProjectItem[] = data?.data?.items || [];
  const groupProjects: GitProjectItem[] = groupProjectsData?.data?.items || [];

  const columns: ColumnsType<GitProjectItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: GitProjectItem) => (
        <a onClick={() => navigate(`/git/projects/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (p: string) => <code style={{ fontSize: 12 }}>{shortenPath(p)}</code>,
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      width: 120,
      render: (b: string) => (b ? <Tag>{b}</Tag> : <Tag>—</Tag>),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const info = getGitStatusInfo(s);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Group',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 120,
      render: (g: string) => (g ? <Tag color="purple">{g}</Tag> : <Tag>—</Tag>),
    },
    {
      title: 'Action',
      key: 'action',
      width: 220,
      render: (_: unknown, record: GitProjectItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/git/projects/${record.id}`)}
          >
            详情
          </Button>
          <Button
            size="small"
            onClick={() => openGroupModal([record.id])}
          >
            分组
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'projects',
      label: '项目列表',
      children: (
        <>
          {/* 扫描区域 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: '#fafafa',
              borderRadius: 6,
            }}
          >
            <Input
              placeholder="扫描路径, e.g. ~/workspace"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              onPressEnter={handleScan}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="深度"
              type="number"
              min={1}
              max={10}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={handleScan}
              loading={scanMutation.isPending}
            >
              Scan
            </Button>
          </div>

          {/* 批量操作栏 */}
          {selectedRowKeys.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: '8px 12px',
                background: '#e6f4ff',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                已选 <strong>{selectedRowKeys.length}</strong> 个项目
              </span>
              <Space>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => openGroupModal(selectedRowKeys)}
                >
                  批量移动到分组
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  取消选择
                </Button>
              </Space>
            </div>
          )}

          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 20 }}
            onRow={(r) => ({
              onDoubleClick: () => navigate(`/git/projects/${r.id}`),
            })}
          />
        </>
      ),
    },
    {
      key: 'groups',
      label: '分组管理',
      children: (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* 分组卡片列表 */}
          <div style={{ flex: selectedGroup ? '0 0 45%' : '1' }}>
            {groups.length === 0 ? (
              <Empty description="暂无分组">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/git/groups')}
                >
                  前往创建分组
                </Button>
              </Empty>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: selectedGroup
                    ? '1fr'
                    : 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 12,
                }}
              >
                {groups.map((g) => (
                  <Card
                    key={g.id}
                    hoverable
                    size="small"
                    style={{
                      border:
                        selectedGroup?.id === g.id
                          ? '2px solid #1677ff'
                          : undefined,
                    }}
                    title={
                      <a
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroup(
                            selectedGroup?.id === g.id ? null : g,
                          );
                        }}
                      >
                        {g.name}
                      </a>
                    }
                    extra={
                      <span onClick={(e) => e.stopPropagation()}>
                        <Popconfirm
                          title="确认删除此分组？"
                          onConfirm={() => deleteGroupMutation.mutate(g.id)}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </span>
                    }
                    onClick={() => navigate(`/git/groups/${g.id}`)}
                  >
                    <p
                      style={{
                        color: '#8c8c8c',
                        minHeight: 36,
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      {g.description || '暂无描述'}
                    </p>
                    <Space direction="vertical" size={2}>
                      <Text>
                        <strong>{g.projectCount}</strong> 个项目
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <FolderOpenOutlined /> RAG:{' '}
                        {shortenPath(g.ragPath) || '—'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <FolderOpenOutlined /> Index:{' '}
                        {shortenPath(g.indexPath) || '—'}
                      </Text>
                    </Space>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 选中分组 → 通过 API 查询项目列表 */}
          {selectedGroup && (
            <div style={{ flex: '0 0 55%' }}>
              <Card
                title={
                  <span>
                    {selectedGroup.name} · 项目 ({groupProjects.length})
                  </span>
                }
                extra={
                  <Button
                    size="small"
                    onClick={() => setSelectedGroup(null)}
                  >
                    关闭
                  </Button>
                }
              >
                {groupProjects.length === 0 && !groupProjectsLoading ? (
                  <Empty
                    description="该分组下暂无项目"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Table
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        render: (t: string, r: GitProjectItem) => (
                          <a onClick={() => navigate(`/git/projects/${r.id}`)}>
                            {t}
                          </a>
                        ),
                      },
                      {
                        title: 'Path',
                        dataIndex: 'path',
                        render: (p: string) => (
                          <code style={{ fontSize: 12 }}>
                            {shortenPath(p)}
                          </code>
                        ),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        render: (s: string) => {
                          const info = getGitStatusInfo(s);
                          return (
                            <Tag color={info.color}>{info.label}</Tag>
                          );
                        },
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 80,
                        render: (_: unknown, r: GitProjectItem) => (
                          <Button
                            size="small"
                            type="link"
                            onClick={() =>
                              navigate(`/git/projects/${r.id}`)
                            }
                          >
                            详情
                          </Button>
                        ),
                      },
                    ]}
                    dataSource={groupProjects}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    loading={groupProjectsLoading}
                  />
                )}
              </Card>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Git Projects"
      extra={
        <Button onClick={() => navigate('/git/groups')}>管理分组</Button>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* 分组选择弹窗（单条 + 批量共用，走 batchAssignGroup 接口） */}
      <Modal
        title={
          selectedRowKeys.length > 1
            ? `将 ${selectedRowKeys.length} 个项目移动到分组`
            : '将项目加入分组'
        }
        open={groupModalOpen}
        onOk={() => {
          if (selectGroupId) {
            assignGroupMutation.mutate({
              projectIds: selectedRowKeys.map(Number),
              groupId: selectGroupId,
            });
          }
        }}
        onCancel={() => setGroupModalOpen(false)}
        confirmLoading={assignGroupMutation.isPending}
        okButtonProps={{ disabled: !selectGroupId }}
      >
        <Select
          style={{ width: '100%', marginTop: 16 }}
          placeholder="选择目标分组"
          value={selectGroupId}
          onChange={setSelectGroupId}
          options={groups.map((g) => ({ label: g.name, value: g.id }))}
        />
      </Modal>
    </PageContainer>
  );
};

export default GitProjects;
