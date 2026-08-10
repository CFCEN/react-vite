import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import {
  Descriptions,
  Button,
  Space,
  Spin,
  App,
  Input,
  Tag,
  Form,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EditOutlined,
  CloseOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { configApi } from '@/api/configApi';
import { shortenPath } from '@/utils/path';
import { formatFileSize, formatDateTime } from '@/utils/format';
import PageContainer from '@/components/PageContainer';

const getFileExtension = (path: string): string => {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const getLanguageExtension = (path: string) => {
  const ext = getFileExtension(path);
  switch (ext) {
    case 'json':
    case 'jsonc':
      return json();
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'mjs':
    case 'cjs':
      return javascript({ typescript: ext === 'ts' || ext === 'tsx' });
    default:
      return [];
  }
};

const ConfigDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [content, setContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['configFile', id],
    queryFn: () => configApi.getById(Number(id)),
    enabled: !!id,
    gcTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => configApi.update(Number(id), { content }),
    onSuccess: () => {
      message.success('内容已保存');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['configFile', id] });
    },
  });

  const metaMutation = useMutation({
    mutationFn: (values: { name: string; path: string; description: string; groupName: string }) =>
      configApi.update(Number(id), values),
    onSuccess: () => {
      message.success('元数据已更新');
      setEditingMeta(false);
      queryClient.invalidateQueries({ queryKey: ['configFile', id] });
    },
  });

  useEffect(() => {
    if (data?.data?.content !== undefined) {
      setContent(data.data.content);
      setIsDirty(false);
    }
  }, [data?.data?.content]);

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleStartEditMeta = () => {
    const config = data?.data;
    if (config) {
      metaForm.setFieldsValue({
        name: config.name,
        path: config.path,
        description: config.description || '',
        groupName: config.groupName || '',
      });
    }
    setEditingMeta(true);
  };

  const handleCancelEditMeta = () => {
    setEditingMeta(false);
  };

  const handleSaveMeta = () => {
    metaForm.validateFields().then((values) => {
      metaMutation.mutate(values);
    });
  };

  // 快捷键 Cmd+S / Ctrl+S（必须在所有 early return 之前，保证 hooks 调用顺序一致）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, content]);

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  const config = data?.data;
  if (!config) {
    return (
      <PageContainer title="Not Found">
        <p>配置不存在</p>
        <Button onClick={() => navigate('/configurations')}>返回列表</Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={config.name}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
            disabled={isDirty}
          >
            刷新
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/configurations')}
          >
            返回
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            保存
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>元数据</h4>
          {editingMeta ? (
            <Space size="small">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleSaveMeta}
                loading={metaMutation.isPending}
              >
                保存
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancelEditMeta}
              >
                取消
              </Button>
            </Space>
          ) : (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={handleStartEditMeta}
            >
              编辑
            </Button>
          )}
        </div>

        {editingMeta ? (
          <Form form={metaForm} layout="vertical" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Form.Item name="name" label="Name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="配置名称" />
              </Form.Item>
              <Form.Item name="groupName" label="Group">
                <Input placeholder="分组名称" />
              </Form.Item>
              <Form.Item name="path" label="Path" rules={[{ required: true, message: '请输入路径' }]}>
                <Input placeholder="文件路径" />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <Input placeholder="描述" />
              </Form.Item>
            </div>
          </Form>
        ) : (
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
          >
            <Descriptions.Item label="Name">{config.name}</Descriptions.Item>
            <Descriptions.Item label="Path">
              <code>{config.path}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Display Path">
              {shortenPath(config.path)}
            </Descriptions.Item>
            <Descriptions.Item label="Size">
              {formatFileSize(config.size)}
            </Descriptions.Item>
            <Descriptions.Item label="Modified At">
              {formatDateTime(config.modifiedAt)}
            </Descriptions.Item>
            {config.groupName && (
              <Descriptions.Item label="Group">
                <Tag color="blue">{config.groupName}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Description">
              {config.description || '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </div>

      <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
        <CodeMirror
          value={content}
          onChange={(val) => {
            setContent(val);
            setIsDirty(true);
          }}
          extensions={getLanguageExtension(config.path)}
          height="500px"
          theme="light"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
        />
      </div>
      {isDirty && (
        <div style={{ marginTop: 8, color: '#faad14', fontSize: 12 }}>
          * 有未保存的修改 (Cmd+S 保存)
        </div>
      )}
    </PageContainer>
  );
};

export default ConfigDetail;
