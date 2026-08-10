import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import {
  Descriptions,
  Button,
  Spin,
  Tag,
  Card,
  Empty,
  Table,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  App,
  Tabs,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FileAddOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { gitApi } from '@/api/gitApi';
import type { GitProjectItem } from '@/types/git';
import type { ProjectContext, ContextFile } from '@/types/workspace';
import { getGitStatusInfo } from '@/utils/format';
import { shortenPath } from '@/utils/path';
import PageContainer from '@/components/PageContainer';

const GitGroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const groupId = Number(id);

  // context modal
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<ProjectContext | null>(null);
  const [contextForm] = Form.useForm();

  // ---------- 文档管理状态 ----------
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docContext, setDocContext] = useState<ProjectContext | null>(null);
  const [docTab, setDocTab] = useState<'rag' | 'index'>('rag');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isNewFile, setIsNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [saving, setSaving] = useState(false);

  // 文件列表查询
  const {
    data: filesData,
    isLoading: filesLoading,
    isFetching: filesFetching,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['gitContextFiles', docContext?.id, docTab],
    queryFn: () =>
      gitApi.listContextFiles(docContext!.groupId, docContext!.id, docTab),
    enabled: !!docContext && docModalOpen,
  });

  // 读取文件内容
  const {
    data: fileContentData,
    isFetching: contentFetching,
    refetch: refetchContent,
  } = useQuery({
    queryKey: ['gitContextFileContent', docContext?.id, docTab, selectedFile],
    queryFn: () =>
      gitApi.getContextFileContent(docContext!.groupId, docContext!.id, docTab, selectedFile!),
    enabled: !!docContext && docModalOpen && !!selectedFile && !isNewFile,
  });

  // 当选中文件变化时，将内容填入编辑器
  // useEffect is already available — but we need to import it
  // We'll use the query's onSuccess or just set it when data arrives
  // Actually, let's use a simpler pattern: read from fileContentData in render

  const files: ContextFile[] = filesData?.data?.items || [];

  // 选中文件时同步内容到编辑器
  useEffect(() => {
    if (fileContentData?.data) {
      setEditingContent(fileContentData.data.content);
    }
  }, [fileContentData]);

  // 创建/更新文件（复用同一个 mutation 逻辑）
  const handleSaveFile = async () => {
    if (!docContext) return;
    setSaving(true);
    try {
      if (isNewFile) {
        await gitApi.createContextFile(docContext.groupId, docContext.id, {
          type: docTab,
          fileName: newFileName,
          content: editingContent,
        });
        message.success('文件已创建');
        setSelectedFile(newFileName);
        setIsNewFile(false);
        setNewFileName('');
      } else if (selectedFile) {
        await gitApi.updateContextFile(docContext.groupId, docContext.id, {
          type: docTab,
          fileName: selectedFile,
          content: editingContent,
        });
        message.success('文件已保存');
      }
      refetchFiles();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!docContext) return;
    await gitApi.deleteContextFile(docContext.groupId, docContext.id, docTab, fileName);
    message.success('文件已删除');
    if (selectedFile === fileName) {
      setSelectedFile(null);
      setEditingContent('');
    }
    refetchFiles();
  };

  // 打开文档管理弹窗
  const handleOpenDocs = (ctx: ProjectContext) => {
    setDocContext(ctx);
    setDocTab('rag');
    setSelectedFile(null);
    setEditingContent('');
    setIsNewFile(false);
    setNewFileName('');
    setDocModalOpen(true);
  };

  // 选中文件
  const handleSelectFile = (fileName: string) => {
    setSelectedFile(fileName);
    setIsNewFile(false);
    setNewFileName('');
  };

  // 新建文件
  const handleNewFile = () => {
    setSelectedFile(null);
    setIsNewFile(true);
    setNewFileName('');
    setEditingContent('');
  };

  const { data: groupData, isLoading, isFetching: groupFetching, refetch: refetchGroup } = useQuery({
    queryKey: ['gitGroup', id],
    queryFn: () => gitApi.getGroupById(groupId),
    enabled: !!id,
  });

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['gitGroupProjects', groupId],
    queryFn: () => gitApi.listProjectsByGroup(groupId),
    enabled: !!id,
  });

  const {
    data: contextsData,
    isLoading: contextsLoading,
    isFetching: contextsFetching,
    refetch: refetchContexts,
  } = useQuery({
    queryKey: ['gitContexts', groupId],
    queryFn: () => gitApi.listContexts(groupId),
    enabled: !!id,
  });

  const createContextMutation = useMutation({
    mutationFn: (values: { name: string }) =>
      gitApi.createContext(groupId, values),
    onSuccess: () => {
      message.success('Context 已创建');
      queryClient.invalidateQueries({ queryKey: ['gitContexts', groupId] });
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
      message.success('Context 已更新');
      queryClient.invalidateQueries({ queryKey: ['gitContexts', groupId] });
      setContextModalOpen(false);
      setEditingContext(null);
      contextForm.resetFields();
    },
  });

  const deleteContextMutation = useMutation({
    mutationFn: (contextId: number) => gitApi.deleteContext(groupId, contextId),
    onSuccess: () => {
      message.success('Context 已删除');
      queryClient.invalidateQueries({ queryKey: ['gitContexts', groupId] });
    },
  });

  const handleAddContext = () => {
    setEditingContext(null);
    contextForm.resetFields();
    setContextModalOpen(true);
  };

  const handleEditContext = (ctx: ProjectContext) => {
    setEditingContext(ctx);
    contextForm.setFieldsValue({
      name: ctx.name || '',
      ragPath: ctx.ragPath,
      indexPath: ctx.indexPath,
    });
    setContextModalOpen(true);
  };

  const handleContextSubmit = () => {
    contextForm.validateFields().then((values) => {
      if (editingContext) {
        updateContextMutation.mutate({ contextId: editingContext.id, values });
      } else {
        createContextMutation.mutate({ name: values.name });
      }
    });
  };

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
      </PageContainer>
    );
  }

  const group = groupData?.data;
  if (!group) {
    return (
      <PageContainer title="Not Found">
        <p>分组不存在</p>
        <Button onClick={() => navigate('/git/groups')}>返回分组列表</Button>
      </PageContainer>
    );
  }

  const handleRefresh = () => {
    refetchGroup();
    refetchProjects();
    refetchContexts();
  };

  const handleRefreshDocs = () => {
    refetchFiles();
    if (selectedFile && !isNewFile) {
      refetchContent();
    }
  };

  const groupProjects: GitProjectItem[] = projectsData?.data?.items || [];
  const contexts: ProjectContext[] = contextsData?.data?.items || [];

  const indexStatusColor: Record<string, string> = {
    NOT_INDEXED: 'default',
    INDEXING: 'processing',
    READY: 'green',
    FAILED: 'red',
    OUTDATED: 'orange',
  };

  const projectColumns: ColumnsType<GitProjectItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (t: string, r: GitProjectItem) => (
        <a onClick={() => navigate(`/git/projects/${r.id}`)}>{t}</a>
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
      render: (b: string) => b ? <Tag>{b}</Tag> : <Tag>—</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const info = getGitStatusInfo(s);
        return <Tag color={info.color}>{info.label}</Tag>;
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
          onClick={() => navigate(`/git/projects/${r.id}`)}
        >
          详情
        </Button>
      ),
    },
  ];

  const contextColumns: ColumnsType<ProjectContext> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (n: string) => n || <Tag>未命名</Tag>,
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
      title: 'Status',
      dataIndex: 'indexStatus',
      key: 'indexStatus',
      width: 110,
      render: (s: string) => <Tag color={indexStatusColor[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 200,
      render: (_: unknown, ctx: ProjectContext) => (
        <Space size="small">
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleOpenDocs(ctx)}
          >
            文档
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditContext(ctx)}
          />
          <Popconfirm
            title="确认删除此 Context？"
            onConfirm={() => deleteContextMutation.mutate(ctx.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={group.name}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={groupFetching || projectsFetching || contextsFetching}
          >
            刷新
          </Button>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/git/groups')}>
            返回
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Group Info */}
        <Card title="Group Info">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Name">{group.name}</Descriptions.Item>
            <Descriptions.Item label="Description">{group.description || '—'}</Descriptions.Item>
            <Descriptions.Item label="Project Count">
              <Tag color="blue">{group.projectCount}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="RAG Path">
              <code>{shortenPath(group.ragPath) || '—'}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Index Path" span={2}>
              <code>{shortenPath(group.indexPath) || '—'}</code>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* AI Contexts */}
        <Card
          title={`AI Contexts (${contexts.length})`}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddContext}
            >
              添加 Context
            </Button>
          }
        >
          {contexts.length === 0 && !contextsLoading ? (
            <Empty
              description="暂无 Context"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <span style={{ color: '#8c8c8c', fontSize: 13 }}>
                Context 定义了 AI 可读取的代码目录，用于代码理解和检索。
              </span>
            </Empty>
          ) : (
            <Table
              columns={contextColumns}
              dataSource={contexts}
              rowKey="id"
              pagination={false}
              size="small"
              loading={contextsLoading}
            />
          )}
        </Card>

        {/* Projects */}
        <Card title={`Projects (${groupProjects.length})`}>
          {groupProjects.length === 0 && !projectsLoading ? (
            <Empty description="该分组下暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              columns={projectColumns}
              dataSource={groupProjects}
              rowKey="id"
              pagination={false}
              size="small"
              loading={projectsLoading}
            />
          )}
        </Card>
      </Space>

      {/* Context 创建/编辑弹窗 */}
      <Modal
        title={editingContext ? '编辑 Context' : '添加 Context'}
        open={contextModalOpen}
        onOk={handleContextSubmit}
        onCancel={() => {
          setContextModalOpen(false);
          setEditingContext(null);
          contextForm.resetFields();
        }}
        confirmLoading={
          createContextMutation.isPending || updateContextMutation.isPending
        }
        width={560}
      >
        <Form form={contextForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入 Context 名称' }]}
            extra={
              editingContext
                ? undefined
                : '创建时会自动使用分组的 RAG Path / Index Path 加上该名称生成目录。'
            }
          >
            <Input placeholder="如：deployment" />
          </Form.Item>
          {editingContext && (
            <>
              <Form.Item
                name="ragPath"
                label="RAG Path"
                rules={[{ required: true, message: '请输入 RAG 路径' }]}
              >
                <Input placeholder="/workspace/rag/frontend" />
              </Form.Item>
              <Form.Item
                name="indexPath"
                label="Index Path"
                rules={[{ required: true, message: '请输入 Index 路径' }]}
              >
                <Input placeholder="/workspace/index/frontend" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Context 文档管理弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>{docContext?.name || 'Context'} — 文档管理</span>
          </Space>
        }
        open={docModalOpen}
        onCancel={() => {
          setDocModalOpen(false);
          setDocContext(null);
          setSelectedFile(null);
          setEditingContent('');
          setIsNewFile(false);
          setNewFileName('');
        }}
        footer={null}
        width={900}
      >
        {!docContext ? (
          <Empty description="请先选择 Context" />
        ) : (
          <div style={{ display: 'flex', gap: 16, minHeight: 400 }}>
            {/* 左侧：文件列表 */}
            <div style={{ width: 240, borderRight: '1px solid #f0f0f0', paddingRight: 8 }}>
              <Tabs
                activeKey={docTab}
                onChange={(k) => {
                  setDocTab(k as 'rag' | 'index');
                  setSelectedFile(null);
                  setEditingContent('');
                  setIsNewFile(false);
                  setNewFileName('');
                }}
                size="small"
                items={[
                  { key: 'rag', label: 'RAG 文档' },
                  { key: 'index', label: 'Index 文档' },
                ]}
              />
              <div style={{ marginBottom: 8 }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefreshDocs}
                    loading={filesFetching || contentFetching}
                  >
                    刷新
                  </Button>
                  <Button
                    type="dashed"
                  size="small"
                  icon={<FileAddOutlined />}
                  onClick={handleNewFile}
                    style={{ flex: 1 }}
                  >
                    新建文档
                  </Button>
                </Space.Compact>
              </div>
              <List
                size="small"
                loading={filesLoading}
                dataSource={files}
                locale={{ emptyText: <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                renderItem={(f) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 4,
                      background:
                        selectedFile === f.name && !isNewFile ? '#e6f4ff' : undefined,
                    }}
                    onClick={() => handleSelectFile(f.name)}
                    actions={[
                      <Popconfirm
                        key="del"
                        title="确认删除此文件？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteFile(f.name);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                      >
                        <Button
                          size="small"
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={4}>
                          <FileTextOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                          <span style={{ fontSize: 13 }}>{f.name}</span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                style={{ maxHeight: 340, overflow: 'auto' }}
              />
            </div>

            {/* 右侧：编辑器 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* 新建文件时显示文件名输入框 */}
              {isNewFile && (
                <div style={{ marginBottom: 12 }}>
                  <Input
                    placeholder="文件名，如 README.md"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    addonBefore="File"
                    size="small"
                  />
                </div>
              )}

              {!selectedFile && !isNewFile ? (
                <Empty
                  description="请从左侧选择文件"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginTop: 60 }}
                />
              ) : (
                <>
                  <Input.TextArea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    placeholder="输入文档内容（支持 Markdown）..."
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, resize: 'none' }}
                    styles={{ textarea: { minHeight: 320 } }}
                  />
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <Space>
                      <Button
                        onClick={() => {
                          if (isNewFile) {
                            setIsNewFile(false);
                            setNewFileName('');
                            setEditingContent('');
                          } else {
                            setSelectedFile(null);
                            setEditingContent('');
                          }
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        type="primary"
                        loading={saving}
                        onClick={handleSaveFile}
                        disabled={
                          isNewFile
                            ? !newFileName.trim() || !docContext
                            : !selectedFile
                        }
                      >
                        保存
                      </Button>
                    </Space>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default GitGroupDetail;
