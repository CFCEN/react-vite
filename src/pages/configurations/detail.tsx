import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useBlocker } from 'react-router';
import {
  Descriptions,
  Button,
  Space,
  App,
  Input,
  Tag,
  Form,
  Modal,
  Typography,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EditOutlined,
  CloseOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState, useCallback, type ComponentProps } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { configApi } from '@/api/configApi';
import { formatFileSize } from '@/utils/format';
import { useTheme } from '@/hooks';
import {
  PageContainer,
  EmptyState,
  PathText,
  TimeText,
} from '@/components';
import './index.less';

const { Text } = Typography;

type CodeMirrorExtensions = NonNullable<ComponentProps<typeof CodeMirror>['extensions']>;

function getFileExtension(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? '';
  const parts = base.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getFilename(path: string): string {
  return path.split(/[/\\]/).pop()?.toLowerCase() ?? '';
}

type LangInfo = {
  label: string;
  sync?: CodeMirrorExtensions;
  /** language-data name for async load */
  dynamicName?: string;
};

function resolveLanguage(path: string): LangInfo {
  const ext = getFileExtension(path);
  const filename = getFilename(path);

  if (ext === 'json' || ext === 'jsonc' || filename.endsWith('.json')) {
    return { label: 'JSON', sync: [json()] };
  }
  if (ext === 'ts' || ext === 'tsx' || ext === 'mts' || ext === 'cts') {
    return { label: 'TypeScript', sync: [javascript({ typescript: true, jsx: ext === 'tsx' })] };
  }
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return { label: 'JavaScript', sync: [javascript({ jsx: ext === 'jsx' })] };
  }
  if (ext === 'md' || ext === 'markdown' || ext === 'mdx') {
    return { label: 'Markdown', sync: [markdown()] };
  }
  if (ext === 'yml' || ext === 'yaml') {
    return { label: 'YAML', dynamicName: 'YAML' };
  }
  if (ext === 'toml') {
    return { label: 'TOML', dynamicName: 'TOML' };
  }
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh' || ext === 'ksh' || filename === '.zshrc' || filename === '.bashrc') {
    return { label: 'Shell', dynamicName: 'Shell' };
  }

  // Try language-data by extension as a last resort
  const match = languages.find((lang) =>
    (lang.extensions ?? []).some((e) => e.toLowerCase() === ext),
  );
  if (match) {
    return { label: match.name, dynamicName: match.name };
  }

  return { label: 'Plain text' };
}

const ConfigDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { isDark } = useTheme();

  const numericId = Number(id);
  const idValid = Number.isFinite(numericId) && numericId > 0;

  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm] = Form.useForm();
  const [langExtensions, setLangExtensions] = useState<CodeMirrorExtensions>([]);
  const [langLabel, setLangLabel] = useState('Plain text');
  const [langNote, setLangNote] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['configFile', numericId],
    queryFn: () => configApi.getById(numericId, { silent: true }),
    enabled: idValid,
    gcTime: 0,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: () => configApi.update(numericId, { content }),
    onSuccess: () => {
      message.success('Content saved');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['configFile', numericId] });
      queryClient.invalidateQueries({ queryKey: ['configFiles'] });
    },
  });

  const metaMutation = useMutation({
    mutationFn: (values: {
      name: string;
      path: string;
      description: string;
      groupName: string;
    }) => configApi.update(numericId, values),
    onSuccess: () => {
      message.success('Metadata updated');
      setEditingMeta(false);
      queryClient.invalidateQueries({ queryKey: ['configFile', numericId] });
      queryClient.invalidateQueries({ queryKey: ['configFiles'] });
    },
  });

  const config = detailQuery.data?.data;

  useEffect(() => {
    if (config?.content !== undefined) {
      setContent(config.content);
      setIsDirty(false);
    }
  }, [config?.content]);

  // Language extensions — sync langs immediate; YAML/TOML/Shell via language-data
  useEffect(() => {
    if (!config?.path) {
      setLangExtensions([]);
      setLangLabel('Plain text');
      setLangNote(null);
      return;
    }

    let cancelled = false;
    const info = resolveLanguage(config.path);
    setLangLabel(info.label);

    if (info.sync) {
      setLangExtensions(info.sync);
      setLangNote(null);
      return;
    }

    if (info.dynamicName) {
      const desc = languages.find((l) => l.name === info.dynamicName);
      if (!desc) {
        setLangExtensions([]);
        setLangNote(`${info.label} highlighting unavailable — editing as plain text.`);
        return;
      }
      setLangNote(`Loading ${info.label} language support…`);
      desc
        .load()
        .then((support) => {
          if (cancelled) return;
          setLangExtensions([support]);
          setLangNote(null);
        })
        .catch(() => {
          if (cancelled) return;
          setLangExtensions([]);
          setLangNote(
            `${info.label} language pack failed to load — editing as plain text.`,
          );
        });
      return () => {
        cancelled = true;
      };
    }

    setLangExtensions([]);
    setLangNote(null);
    return undefined;
  }, [config?.path]);

  const handleSave = useCallback(() => {
    if (!isDirty || saveMutation.isPending) return;
    saveMutation.mutate();
  }, [isDirty, saveMutation]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    Modal.confirm({
      title: 'Discard unsaved changes?',
      content: 'You have unsaved edits. Leave this page without saving?',
      okText: 'Leave',
      cancelText: 'Stay',
      okButtonProps: { danger: true },
      onOk: () => blocker.proceed?.(),
      onCancel: () => blocker.reset?.(),
    });
  }, [blocker]);

  const cmTheme = useMemo(() => (isDark ? 'dark' : 'light'), [isDark]);
  const extensions = useMemo(() => langExtensions, [langExtensions]);

  if (!idValid) {
    return (
      <PageContainer title="Configuration">
        <EmptyState
          title="Invalid configuration id"
          description="The URL id must be a positive number."
          action={{
            text: 'Back to list',
            onClick: () => navigate('/configurations'),
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={config?.name ?? 'Configuration'}
      subTitle={config ? <PathText path={config.path} /> : undefined}
      loading={detailQuery.isLoading}
      loadingVariant="detail"
      error={detailQuery.isError ? (detailQuery.error as Error) : null}
      onRetry={() => detailQuery.refetch()}
      className="config-detail-page"
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            className="ldw-clickable"
            onClick={() => detailQuery.refetch()}
            loading={detailQuery.isFetching}
            disabled={isDirty}
            aria-label="Refresh"
            title={isDirty ? 'Save or discard changes before refresh' : 'Refresh'}
          >
            Refresh
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            className="ldw-clickable"
            onClick={() => navigate('/configurations')}
          >
            Back
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            className="ldw-clickable"
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            Save
          </Button>
        </Space>
      }
    >
      {!config ? (
        <EmptyState
          title="Configuration not found"
          description="This configuration record does not exist."
          action={{
            text: 'Back to list',
            onClick: () => navigate('/configurations'),
          }}
        />
      ) : (
        <div className="config-detail">
          <section className="config-meta">
            <div className="config-meta__header">
              <h4 className="config-meta__title">Metadata</h4>
              {editingMeta ? (
                <Space size="small">
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    className="ldw-clickable"
                    onClick={() =>
                      metaForm.validateFields().then((values) => metaMutation.mutate(values))
                    }
                    loading={metaMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    className="ldw-clickable"
                    onClick={() => setEditingMeta(false)}
                  >
                    Cancel
                  </Button>
                </Space>
              ) : (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  className="ldw-clickable"
                  onClick={() => {
                    metaForm.setFieldsValue({
                      name: config.name,
                      path: config.path,
                      description: config.description || '',
                      groupName: config.groupName || '',
                    });
                    setEditingMeta(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>

            {editingMeta ? (
              <Form form={metaForm} layout="vertical" size="small" className="config-meta__form">
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true, message: 'Name is required' }]}
                >
                  <Input placeholder="Name" />
                </Form.Item>
                <Form.Item name="groupName" label="Group">
                  <Input placeholder="Group name" />
                </Form.Item>
                <Form.Item
                  name="path"
                  label="Path"
                  rules={[{ required: true, message: 'Path is required' }]}
                >
                  <Input placeholder="File path" />
                </Form.Item>
                <Form.Item name="description" label="Description">
                  <Input placeholder="Description" />
                </Form.Item>
              </Form>
            ) : (
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Name">{config.name}</Descriptions.Item>
                <Descriptions.Item label="Path">
                  <PathText path={config.path} />
                </Descriptions.Item>
                <Descriptions.Item label="Size">
                  {formatFileSize(config.size)}
                </Descriptions.Item>
                <Descriptions.Item label="Modified">
                  <TimeText value={config.modifiedAt} />
                </Descriptions.Item>
                <Descriptions.Item label="Group">
                  {config.groupName ? (
                    <Tag color="blue">{config.groupName}</Tag>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Language">
                  <Tag>{langLabel}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  {config.description || '—'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </section>

          {langNote ? (
            <Alert type="info" showIcon message={langNote} className="config-lang-note" />
          ) : null}

          {isDirty ? (
            <Alert
              type="warning"
              showIcon
              message="Unsaved changes — press Cmd/Ctrl+S to save"
              className="config-dirty-note"
            />
          ) : null}

          <div className="config-editor">
            <CodeMirror
              value={content}
              onChange={(val) => {
                setContent(val);
                setIsDirty(true);
              }}
              extensions={extensions}
              theme={cmTheme}
              height="100%"
              className="config-editor__cm"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
              }}
            />
          </div>
          <Text type="secondary" className="config-editor-hint">
            Language: {langLabel}. Theme follows app light/dark mode.
          </Text>
        </div>
      )}
    </PageContainer>
  );
};

export default ConfigDetail;
