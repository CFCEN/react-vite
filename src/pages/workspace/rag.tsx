import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Drawer,
  List,
  Space,
  Typography,
  Breadcrumb,
} from 'antd';
import {
  FolderOpenOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { workspaceApi } from '@/api/workspaceApi';
import { gitApi } from '@/api/gitApi';
import type { ContextFile, ProjectContext } from '@/types/workspace';
import {
  PageContainer,
  StatusTag,
  PathText,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  TimeText,
  CopyableText,
} from '@/components';
import './index.less';

const { Text, Paragraph } = Typography;

interface RagTreeNode {
  dir: string;
  groupId?: number;
  groupName?: string;
  contexts: ProjectContext[];
}

const WorkspaceRag = () => {
  const navigate = useNavigate();
  const [selectedContext, setSelectedContext] = useState<ProjectContext | null>(null);
  const [selectedFile, setSelectedFile] = useState<ContextFile | null>(null);

  const workspaceQuery = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const groupsQuery = useQuery({
    queryKey: ['gitGroups'],
    queryFn: () => gitApi.listGroups(),
  });

  const filesQuery = useQuery({
    queryKey: ['contextFiles', 'rag', selectedContext?.groupId, selectedContext?.id],
    queryFn: () =>
      gitApi.listContextFiles(selectedContext!.groupId, selectedContext!.id, 'rag'),
    enabled: !!selectedContext,
  });

  const fileContentQuery = useQuery({
    queryKey: [
      'contextFileContent',
      'rag',
      selectedContext?.groupId,
      selectedContext?.id,
      selectedFile?.name,
    ],
    queryFn: () =>
      gitApi.getContextFileContent(
        selectedContext!.groupId,
        selectedContext!.id,
        'rag',
        selectedFile!.name,
      ),
    enabled: !!selectedContext && !!selectedFile && !selectedFile.isDir,
  });

  const overview = workspaceQuery.data?.data;
  // Stabilize empty fallback — otherwise group maps recompute every render while loading
  const groups = useMemo(
    () => groupsQuery.data?.data?.items ?? [],
    [groupsQuery.data?.data?.items],
  );

  const groupByName = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    for (const g of groups) map.set(g.name, { id: g.id, name: g.name });
    return map;
  }, [groups]);

  const groupNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of groups) map.set(g.id, g.name);
    return map;
  }, [groups]);

  const tree: RagTreeNode[] = useMemo(() => {
    const dirs = overview?.ragDirs ?? [];
    const contexts = overview?.contexts ?? [];
    return dirs.map((dir) => {
      const group = groupByName.get(dir);
      const matched = contexts.filter((ctx) => {
        if (group && ctx.groupId === group.id) return true;
        return ctx.ragPath.includes(`/rag/${dir}/`) || ctx.ragPath.endsWith(`/rag/${dir}`);
      });
      return {
        dir,
        groupId: group?.id,
        groupName: group?.name ?? dir,
        contexts: matched.map((c) => ({
          ...c,
          groupName: c.groupName || groupNameById.get(c.groupId) || dir,
        })),
      };
    });
  }, [overview?.ragDirs, overview?.contexts, groupByName, groupNameById]);

  const loading = workspaceQuery.isLoading || groupsQuery.isLoading;
  const error = workspaceQuery.error || groupsQuery.error;
  const refreshing = workspaceQuery.isFetching || groupsQuery.isFetching;

  const handleRefresh = () => {
    void workspaceQuery.refetch();
    void groupsQuery.refetch();
    if (selectedContext) void filesQuery.refetch();
  };

  const files = filesQuery.data?.data?.items ?? [];

  return (
    <PageContainer
      title="Workspace · RAG"
      subTitle="Browse RAG directories, contexts, and documents"
      loading={loading}
      loadingVariant="cards"
      error={error}
      onRetry={handleRefresh}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
          aria-label="Refresh RAG workspace"
        >
          Refresh
        </Button>
      }
    >
      <div className="workspace-page">
        <Card title="Workspace Root" className="workspace-card" size="small">
          {overview?.root ? <PathText path={overview.root} /> : <Text type="secondary">—</Text>}
        </Card>

        {!selectedContext ? (
          <Card title="RAG Directory Tree" className="workspace-card">
            {tree.length === 0 ? (
              <EmptyState
                preset="folder"
                title="No RAG directories"
                description="RAG dirs are created with Git groups and hold retrieval documents."
                action={{
                  text: 'Open Git Groups',
                  onClick: () => navigate('/git/groups'),
                }}
              />
            ) : (
              <div className="rag-tree">
                {tree.map((node) => (
                  <div key={node.dir} className="rag-tree-group">
                    <div className="rag-tree-group-header">
                      <FolderOpenOutlined aria-hidden />
                      <Text strong>{node.dir}</Text>
                      {node.groupId ? (
                        <button
                          type="button"
                          className="workspace-link-btn ldw-clickable"
                          onClick={() => navigate(`/git/groups/${node.groupId}`)}
                          aria-label={`Open group ${node.groupName}`}
                        >
                          Open group
                        </button>
                      ) : null}
                    </div>
                    {node.contexts.length === 0 ? (
                      <Text type="secondary" className="rag-tree-empty">
                        No contexts in this directory
                      </Text>
                    ) : (
                      <ul className="rag-tree-contexts">
                        {node.contexts.map((ctx) => (
                          <li key={ctx.id}>
                            <button
                              type="button"
                              className="rag-context-row ldw-clickable"
                              onClick={() => {
                                setSelectedFile(null);
                                setSelectedContext(ctx);
                              }}
                              aria-label={`Browse context ${ctx.name}`}
                            >
                              <span className="rag-context-main">
                                <Text strong>{ctx.name}</Text>
                                <PathText path={ctx.ragPath} />
                              </span>
                              <StatusTag status={ctx.indexStatus} kind="index" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card
            className="workspace-card"
            title={
              <Space wrap>
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => {
                    setSelectedContext(null);
                    setSelectedFile(null);
                  }}
                  aria-label="Back to directory tree"
                >
                  Back
                </Button>
                <Breadcrumb
                  items={[
                    { title: 'RAG' },
                    {
                      title:
                        selectedContext.groupName ||
                        groupNameById.get(selectedContext.groupId) ||
                        'Group',
                    },
                    { title: selectedContext.name },
                  ]}
                />
              </Space>
            }
          >
            <div className="rag-context-meta">
              <PathText path={selectedContext.ragPath} />
              <StatusTag status={selectedContext.indexStatus} kind="index" />
              <Text type="secondary">
                Last indexed:{' '}
                <TimeText value={selectedContext.lastIndexedAt} empty="Never" />
              </Text>
            </div>

            {filesQuery.isLoading ? (
              <LoadingSkeleton variant="table" rows={4} />
            ) : filesQuery.isError ? (
              <ErrorState
                error={filesQuery.error}
                onRetry={() => void filesQuery.refetch()}
              />
            ) : files.length === 0 ? (
              <EmptyState
                preset="folder"
                title="No documents"
                description="This context has no RAG files yet. Add documents from the Git group detail page."
                action={{
                  text: 'Open Group',
                  onClick: () => navigate(`/git/groups/${selectedContext.groupId}`),
                }}
              />
            ) : (
              <List
                size="small"
                dataSource={files}
                renderItem={(file) => (
                  <List.Item
                    className={
                      file.isDir
                        ? 'rag-file-row'
                        : 'rag-file-row rag-file-row--clickable ldw-clickable'
                    }
                    onClick={() => {
                      if (!file.isDir) setSelectedFile(file);
                    }}
                    onKeyDown={(e) => {
                      if (!file.isDir && e.key === 'Enter') setSelectedFile(file);
                    }}
                    role={file.isDir ? undefined : 'button'}
                    tabIndex={file.isDir ? undefined : 0}
                    aria-label={file.isDir ? undefined : `Open ${file.name}`}
                  >
                    <Space>
                      {file.isDir ? (
                        <FolderOpenOutlined aria-hidden />
                      ) : (
                        <FileTextOutlined aria-hidden />
                      )}
                      <Text>{file.name}</Text>
                    </Space>
                    <Text type="secondary">
                      {file.isDir ? 'Directory' : `${file.size} B`}
                    </Text>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </div>

      <Drawer
        title={selectedFile?.name ?? 'Document'}
        open={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        width="min(720px, 100vw)"
        destroyOnClose
      >
        {selectedFile ? (
          <div className="rag-file-drawer">
            <PathText path={selectedFile.path} />
            {fileContentQuery.isLoading ? (
              <LoadingSkeleton variant="detail" />
            ) : fileContentQuery.isError ? (
              <ErrorState
                error={fileContentQuery.error}
                onRetry={() => void fileContentQuery.refetch()}
              />
            ) : (
              <>
                <Paragraph type="secondary" className="rag-file-meta">
                  Size: {fileContentQuery.data?.data?.size ?? selectedFile.size} B ·{' '}
                  <TimeText
                    value={
                      fileContentQuery.data?.data?.modifiedAt ?? selectedFile.modifiedAt
                    }
                  />
                </Paragraph>
                <CopyableText
                  text={fileContentQuery.data?.data?.content ?? ''}
                  display="Copy content"
                  ellipsis={false}
                  mono
                />
                <pre className="rag-file-content">
                  {fileContentQuery.data?.data?.content ?? ''}
                </pre>
              </>
            )}
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default WorkspaceRag;
