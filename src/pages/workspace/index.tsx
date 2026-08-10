import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Typography } from 'antd';
import { FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { workspaceApi } from '@/api/workspaceApi';
import { gitApi } from '@/api/gitApi';
import type { ProjectContext } from '@/types/workspace';
import {
  PageContainer,
  DataTable,
  StatusTag,
  PathText,
  EmptyState,
  TimeText,
  type DataTableColumn,
} from '@/components';
import './index.less';

const { Text } = Typography;

type ContextRow = ProjectContext & { groupName: string };

const WorkspaceIndex = () => {
  const navigate = useNavigate();

  const workspaceQuery = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const groupsQuery = useQuery({
    queryKey: ['gitGroups'],
    queryFn: () => gitApi.listGroups(),
  });

  const overview = workspaceQuery.data?.data;
  // Stabilize empty fallback — otherwise groupNameById useMemo recomputes every render while loading
  const groups = useMemo(
    () => groupsQuery.data?.data?.items ?? [],
    [groupsQuery.data?.data?.items],
  );

  const groupNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of groups) map.set(g.id, g.name);
    return map;
  }, [groups]);

  const contexts: ContextRow[] = useMemo(
    () =>
      (overview?.contexts ?? []).map((ctx) => ({
        ...ctx,
        groupName: ctx.groupName || groupNameById.get(ctx.groupId) || `Group #${ctx.groupId}`,
      })),
    [overview?.contexts, groupNameById],
  );

  const columns: DataTableColumn<ContextRow>[] = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      render: (value) => (value ? String(value) : '—'),
    },
    {
      key: 'groupName',
      title: 'Group',
      dataIndex: 'groupName',
      width: 140,
      render: (_, row) => (
        <button
          type="button"
          className="workspace-link-btn ldw-clickable"
          onClick={() => navigate(`/git/groups/${row.groupId}`)}
          aria-label={`Open group ${row.groupName}`}
        >
          {row.groupName}
        </button>
      ),
    },
    {
      key: 'indexPath',
      title: 'Index Path',
      dataIndex: 'indexPath',
      render: (value) => (value ? <PathText path={String(value)} /> : '—'),
    },
    {
      key: 'indexStatus',
      title: 'Index Status',
      dataIndex: 'indexStatus',
      width: 140,
      render: (value) =>
        value ? <StatusTag status={String(value)} kind="index" /> : '—',
    },
    {
      key: 'lastIndexedAt',
      title: 'Last Indexed',
      dataIndex: 'lastIndexedAt',
      width: 160,
      render: (value) => <TimeText value={value as string | null} empty="—" />,
    },
  ];

  const loading = workspaceQuery.isLoading || groupsQuery.isLoading;
  const error = workspaceQuery.error || groupsQuery.error;
  const refreshing = workspaceQuery.isFetching || groupsQuery.isFetching;

  const handleRefresh = () => {
    void workspaceQuery.refetch();
    void groupsQuery.refetch();
  };

  return (
    <PageContainer
      title="Workspace · Index"
      subTitle="Index directories and project contexts"
      loading={loading}
      loadingVariant="table"
      error={error}
      onRetry={handleRefresh}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
          aria-label="Refresh workspace index"
        >
          Refresh
        </Button>
      }
    >
      <div className="workspace-page">
        <Card title="Index Directories" className="workspace-card">
          {!overview?.indexDirs?.length ? (
            <EmptyState
              preset="folder"
              title="No index directories"
              description="Index dirs store code index data for AI search. They are created with Git groups."
              action={{
                text: 'Open Git Groups',
                onClick: () => navigate('/git/groups'),
              }}
            />
          ) : (
            <div className="workspace-dir-list">
              {overview.indexDirs.map((dir) => (
                <span key={dir} className="workspace-dir-chip">
                  <FolderOpenOutlined aria-hidden />
                  {dir}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={`Project Contexts (${contexts.length})`}
          className="workspace-card"
        >
          <DataTable<ContextRow>
            rowKey="id"
            dataSource={contexts}
            columns={columns}
            loading={false}
            emptyTitle="No contexts"
            emptyDescription="Contexts are created when you add a Git group. Each context maps RAG and Index paths."
            emptyAction={{
              text: 'Open Git Groups',
              onClick: () => navigate('/git/groups'),
            }}
            onRefresh={handleRefresh}
            pagination={false}
            showColumnSettings={false}
          />
        </Card>

        <Card title="Workspace Root" className="workspace-card">
          {overview?.root ? (
            <PathText path={overview.root} />
          ) : (
            <Text type="secondary">—</Text>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default WorkspaceIndex;
