import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Input,
  List,
  Modal,
  Segmented,
  Space,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  FileAddOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import MarkdownPreview from '@uiw/react-markdown-preview';
import '@uiw/react-markdown-preview/markdown.css';
import { gitApi } from '@/api/gitApi';
import type { ProjectContext, ContextFile } from '@/types/workspace';
import {
  ConfirmButton,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '@/components';
import { useTheme } from '@/hooks';

type DocTab = 'rag' | 'index';
type ViewMode = 'source' | 'preview';

export interface ContextDocsModalProps {
  open: boolean;
  context: ProjectContext | null;
  onClose: () => void;
}

const mdExtensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
];

function confirmDiscard(onOk: () => void) {
  Modal.confirm({
    title: 'Discard unsaved changes?',
    content: 'You have unsaved edits. Continue without saving?',
    okText: 'Discard',
    cancelText: 'Stay',
    okButtonProps: { danger: true },
    onOk,
  });
}

/**
 * Full-viewport Documents viewer/editor for a Git group AI context.
 * Source (CodeMirror Markdown) ↔ Preview (@uiw/react-markdown-preview).
 */
const ContextDocsModal = ({ open, context, onClose }: ContextDocsModalProps) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();

  const [docTab, setDocTab] = useState<DocTab>('rag');
  const [viewMode, setViewMode] = useState<ViewMode>('source');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [baselineContent, setBaselineContent] = useState('');
  const [isNewFile, setIsNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const resetEditor = useCallback(() => {
    setSelectedFile(null);
    setEditingContent('');
    setBaselineContent('');
    setIsNewFile(false);
    setNewFileName('');
    setViewMode('source');
  }, []);

  // Reset when modal opens / switches to another context (by id).
  // Intentionally depend on context?.id, not the whole context object — parent may
  // pass a fresh object reference with the same id; resetting on that would wipe edits.
  useEffect(() => {
    if (open && context) {
      setDocTab('rag');
      resetEditor();
      setSidebarCollapsed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [open, context?.id, resetEditor]);

  const {
    data: filesData,
    isLoading: filesLoading,
    isFetching: filesFetching,
    isError: filesError,
    error: filesErr,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['gitContextFiles', context?.id, docTab],
    queryFn: () => gitApi.listContextFiles(context!.groupId, context!.id, docTab),
    enabled: !!context && open,
  });

  const {
    data: fileContentData,
    isFetching: contentFetching,
    isError: contentError,
    error: contentErr,
    refetch: refetchContent,
  } = useQuery({
    queryKey: ['gitContextFileContent', context?.id, docTab, selectedFile],
    queryFn: () =>
      gitApi.getContextFileContent(
        context!.groupId,
        context!.id,
        docTab,
        selectedFile!,
      ),
    enabled: !!context && open && !!selectedFile && !isNewFile,
  });

  const files: ContextFile[] = filesData?.data?.items || [];

  useEffect(() => {
    if (isNewFile) return;
    if (fileContentData?.data) {
      setEditingContent(fileContentData.data.content);
      setBaselineContent(fileContentData.data.content);
    }
  }, [fileContentData, isNewFile]);

  const isDirty = useMemo(() => {
    if (isNewFile) {
      return newFileName.trim().length > 0 || editingContent.length > 0;
    }
    if (!selectedFile) return false;
    return editingContent !== baselineContent;
  }, [isNewFile, newFileName, editingContent, selectedFile, baselineContent]);

  const runOrConfirm = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      confirmDiscard(action);
    },
    [isDirty],
  );

  const saveFileMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('No context');
      if (isNewFile) {
        const name = newFileName.trim();
        if (!name) throw new Error('File name required');
        return gitApi.createContextFile(context.groupId, context.id, {
          type: docTab,
          fileName: name,
          content: editingContent,
        });
      }
      if (!selectedFile) throw new Error('No file selected');
      return gitApi.updateContextFile(context.groupId, context.id, {
        type: docTab,
        fileName: selectedFile,
        content: editingContent,
      });
    },
    onSuccess: () => {
      message.success(isNewFile ? 'File created' : 'File saved');
      const name = isNewFile ? newFileName.trim() : selectedFile!;
      setBaselineContent(editingContent);
      if (isNewFile) {
        setSelectedFile(name);
        setIsNewFile(false);
        setNewFileName('');
      }
      queryClient.invalidateQueries({
        queryKey: ['gitContextFiles', context?.id, docTab],
      });
      queryClient.invalidateQueries({
        queryKey: ['gitContextFileContent', context?.id, docTab, name],
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileName: string) => {
      if (!context) return Promise.reject(new Error('No context'));
      return gitApi.deleteContextFile(
        context.groupId,
        context.id,
        docTab,
        fileName,
      );
    },
    onSuccess: (_res, fileName) => {
      message.success('File deleted');
      if (selectedFile === fileName) {
        resetEditor();
      }
      queryClient.invalidateQueries({
        queryKey: ['gitContextFiles', context?.id, docTab],
      });
    },
  });

  const handleClose = () => {
    runOrConfirm(() => {
      onClose();
      resetEditor();
    });
  };

  const handleSelectFile = (name: string) => {
    if (selectedFile === name && !isNewFile) return;
    runOrConfirm(() => {
      setIsNewFile(false);
      setNewFileName('');
      setSelectedFile(name);
      setViewMode('source');
    });
  };

  const handleNewFile = () => {
    runOrConfirm(() => {
      setSelectedFile(null);
      setIsNewFile(true);
      setNewFileName('');
      setEditingContent('');
      setBaselineContent('');
      setViewMode('source');
    });
  };

  const handleCancelEdit = () => {
    if (isNewFile) {
      setIsNewFile(false);
      setNewFileName('');
      setEditingContent('');
      setBaselineContent('');
      return;
    }
    setEditingContent(baselineContent);
  };

  const handleTabChange = (key: string) => {
    runOrConfirm(() => {
      setDocTab(key as DocTab);
      resetEditor();
    });
  };

  const handleRefresh = () => {
    const doRefresh = () => {
      void refetchFiles();
      if (selectedFile && !isNewFile) void refetchContent();
    };
    if (isDirty) {
      confirmDiscard(doRefresh);
      return;
    }
    doRefresh();
  };

  const cmTheme = isDark ? 'dark' : 'light';
  const showEditor = !!selectedFile || isNewFile;
  const contentBusy = contentFetching && !isNewFile && !!selectedFile;

  const canSave =
    isDirty &&
    !saveFileMutation.isPending &&
    (isNewFile ? newFileName.trim().length > 0 && !!context : !!selectedFile);

  return (
    <Modal
      title={
        <Space wrap size="middle">
          <Space size={8}>
            <FileTextOutlined aria-hidden />
            <span>
              {context?.name || 'Context'} — Documents
              {isDirty ? (
                <Tag color="warning" className="git-doc-dirty-tag">
                  Unsaved
                </Tag>
              ) : null}
            </span>
          </Space>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width="min(96vw, 1280px)"
      className="git-doc-modal"
      destroyOnHidden
      centered
      styles={{
        body: {
          padding: 0,
          height: 'calc(100vh - 120px)',
          maxHeight: 'calc(100vh - 120px)',
          overflow: 'hidden',
        },
      }}
    >
      {!context ? (
        <div className="git-doc-modal__empty">
          <EmptyState title="Select a context first" />
        </div>
      ) : (
        <div
          className={`git-doc-layout${
            sidebarCollapsed ? ' git-doc-layout--sidebar-collapsed' : ''
          }`}
        >
          <aside
            className="git-doc-sidebar"
            aria-label="Document file list"
            hidden={sidebarCollapsed}
          >
            <Tabs
              activeKey={docTab}
              onChange={handleTabChange}
              size="small"
              items={[
                { key: 'rag', label: 'RAG Docs' },
                { key: 'index', label: 'Index Docs' },
              ]}
            />
            <div className="git-doc-sidebar__actions">
              <Tooltip title="Refresh">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={filesFetching || contentFetching}
                  className="ldw-clickable"
                  aria-label="Refresh files"
                />
              </Tooltip>
              <Button
                type="dashed"
                size="small"
                icon={<FileAddOutlined />}
                className="ldw-clickable"
                onClick={handleNewFile}
                aria-label="New file"
              >
                New File
              </Button>
            </div>

            {filesError ? (
              <ErrorState
                error={filesErr as Error}
                onRetry={() => refetchFiles()}
              />
            ) : (
              <List
                size="small"
                loading={filesLoading}
                dataSource={files}
                locale={{
                  emptyText: (
                    <EmptyState title="No documents" preset="folder" />
                  ),
                }}
                renderItem={(f) => (
                  <List.Item
                    className={`git-doc-file${
                      selectedFile === f.name && !isNewFile
                        ? ' git-doc-file--active'
                        : ''
                    } ldw-clickable`}
                    onClick={() => handleSelectFile(f.name)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${f.name}`}
                    aria-current={
                      selectedFile === f.name && !isNewFile ? 'true' : undefined
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectFile(f.name);
                      }
                    }}
                    actions={[
                      <span
                        key="del"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <ConfirmButton
                          size="small"
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          confirmTitle="Delete this file?"
                          confirmDescription="This cannot be undone."
                          okText="Delete"
                          aria-label={`Delete ${f.name}`}
                          onConfirm={async () => {
                            await deleteFileMutation.mutateAsync(f.name);
                          }}
                        />
                      </span>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={4}>
                          <FileTextOutlined className="git-doc-file__icon" />
                          <span>{f.name}</span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                className="git-doc-file-list"
              />
            )}
          </aside>

          <div className="git-doc-editor">
            <div className="git-doc-editor__toolbar">
              <Space wrap size="small">
                <Tooltip
                  title={sidebarCollapsed ? 'Show file list' : 'Hide file list'}
                >
                  <Button
                    type="text"
                    size="small"
                    className="ldw-clickable"
                    icon={
                      sidebarCollapsed ? (
                        <MenuUnfoldOutlined />
                      ) : (
                        <MenuFoldOutlined />
                      )
                    }
                    onClick={() => setSidebarCollapsed((v) => !v)}
                    aria-label={
                      sidebarCollapsed ? 'Show file list' : 'Hide file list'
                    }
                  />
                </Tooltip>
                <span className="git-doc-editor__filename-label">
                  {isNewFile
                    ? 'New file'
                    : selectedFile || 'No file selected'}
                </span>
              </Space>
              {showEditor ? (
                <Segmented
                  size="small"
                  value={viewMode}
                  onChange={(v) => setViewMode(v as ViewMode)}
                  options={[
                    { label: 'Source', value: 'source' },
                    { label: 'Preview', value: 'preview' },
                  ]}
                  aria-label="Editor view mode"
                />
              ) : null}
            </div>

            {isNewFile ? (
              <div className="git-doc-editor__filename">
                <Input
                  placeholder="File name, e.g. README.md"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  addonBefore="File"
                  size="small"
                  aria-label="New file name"
                  autoFocus
                />
              </div>
            ) : null}

            {!showEditor ? (
              <div className="git-doc-editor__empty">
                <EmptyState
                  title="Select a file"
                  description="Pick a document from the left, or create a new one."
                  action={{
                    text: 'New File',
                    icon: <FileAddOutlined />,
                    onClick: handleNewFile,
                  }}
                />
              </div>
            ) : contentError && !isNewFile ? (
              <div className="git-doc-editor__empty">
                <ErrorState
                  error={contentErr as Error}
                  onRetry={() => refetchContent()}
                />
              </div>
            ) : contentBusy && !editingContent ? (
              <div className="git-doc-editor__empty">
                <LoadingSkeleton variant="detail" />
              </div>
            ) : (
              <>
                <div className="git-doc-editor__pane">
                  {viewMode === 'source' ? (
                    <CodeMirror
                      value={editingContent}
                      onChange={(val) => setEditingContent(val)}
                      extensions={mdExtensions}
                      theme={cmTheme}
                      height="100%"
                      className="git-doc-editor__cm"
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        highlightActiveLine: true,
                      }}
                      aria-label="Markdown source editor"
                    />
                  ) : (
                    <div
                      className="git-doc-editor__preview"
                      data-color-mode={isDark ? 'dark' : 'light'}
                    >
                      {editingContent.trim() ? (
                        <MarkdownPreview
                          source={editingContent}
                          wrapperElement={{
                            'data-color-mode': isDark ? 'dark' : 'light',
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            color: 'var(--ldw-text)',
                            padding: 'var(--ldw-space-md)',
                          }}
                        />
                      ) : (
                        <EmptyState
                          title="Nothing to preview"
                          description="Switch to Source and write some Markdown."
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="git-doc-editor__footer">
                  <Space>
                    <Button
                      className="ldw-clickable"
                      onClick={handleCancelEdit}
                      disabled={!isDirty && !isNewFile}
                      aria-label="Cancel edits"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      className="ldw-clickable"
                      loading={saveFileMutation.isPending}
                      onClick={() => saveFileMutation.mutate()}
                      disabled={!canSave}
                      aria-label="Save file"
                    >
                      Save
                    </Button>
                  </Space>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ContextDocsModal;
