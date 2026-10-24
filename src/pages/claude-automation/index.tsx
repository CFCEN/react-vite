import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Badge, Button, Card, Empty, Input, Modal, Space, Tabs, Typography } from 'antd';
import { ExpandOutlined, FolderOpenOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { claudeAutomationApi, sessionKey } from '@/api/claudeAutomationApi';
import { PageContainer, StatusTag, TimeText } from '@/components';
import { useClaudeAutomationSocket } from '@/hooks';
import type { ApiListResponse } from '@/types/api';
import type { ClaudeAutomationSession, ClaudeAutomationSocketMessage } from '@/types/claudeAutomation';
import { ClaudeAutomationSessionDetail } from './session-detail';
import './index.less';

const { Text, Title } = Typography;
type SessionTab = 'sessions' | 'tasks';

function notificationPreview(text: string | null | undefined, fallback: string) {
  const value = text?.replace(/\s+/g, ' ').trim();
  if (!value) return fallback;
  return value.length > 240 ? `${value.slice(0, 237)}...` : value;
}

const STATUS_COLOR: Record<string, string> = {
  running: 'processing',
  waiting: 'warning',
  pending: 'default',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

function SessionCard({ session, onOpen }: { session: ClaudeAutomationSession; onOpen: (adapterId: string, sessionId: string) => void }) {
  const pending = session.pendingActions?.length ?? (session.pendingAction ? 1 : 0);
  return (
    <Card
      size="small"
      className="automation-session-card"
      hoverable
      onClick={() => onOpen(session.adapterId, session.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(session.adapterId, session.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${session.title || session.prompt || session.id}`}
    >
      <div className="automation-session-card__header">
        <Text strong ellipsis>{session.title || session.prompt || session.id}</Text>
        <StatusTag
          status={session.status}
          kind="custom"
          color={STATUS_COLOR[session.status.toLowerCase()]}
          label={session.status === 'waiting' ? '等待确认中' : session.status}
        />
      </div>
      {session.prompt && session.title ? (
        <Text type="secondary" ellipsis={{ tooltip: session.prompt }}>
          {session.prompt}
        </Text>
      ) : null}
      {pending ? <Text type="warning" className="automation-session-card__pending">{pending} pending choice{pending === 1 ? '' : 's'}</Text> : null}
      <div className="automation-session-card__meta">
        <Text type="secondary" className="mono">{session.id}</Text>
        <Text type="secondary"><TimeText value={session.updatedAt} /></Text>
      </div>
    </Card>
  );
}

function SessionGroups({ sessions, empty, onOpen }: { sessions: ClaudeAutomationSession[]; empty: string; onOpen: (adapterId: string, sessionId: string) => void }) {
  const groups = useMemo(() => Array.from(
    sessions.reduce((map, session) => {
      const key = session.project?.id || session.project?.path || session.project?.name || 'unknown';
      const entry = map.get(key) ?? { project: session.project, sessions: [] as ClaudeAutomationSession[] };
      entry.sessions.push(session);
      map.set(key, entry);
      return map;
    }, new Map<string, { project: ClaudeAutomationSession['project']; sessions: ClaudeAutomationSession[] }>()).values(),
  ), [sessions]);

  if (!groups.length) return <Empty description={empty} />;
  return groups.map(({ project, sessions: items }) => (
    <section key={project?.id || project?.path || project?.name} className="automation-project">
      <div className="automation-project__heading">
        <Space><FolderOpenOutlined /><Title level={4}>{project?.name || 'Unknown project'}</Title></Space>
        <Text type="secondary">{items.length} session{items.length === 1 ? '' : 's'}</Text>
      </div>
      {project?.path ? <Text type="secondary" className="automation-project__path mono">{project.path}</Text> : null}
      <div className="automation-session-grid">
        {items.map((session) => <SessionCard key={session.id} session={session} onOpen={onOpen} />)}
      </div>
    </section>
  ));
}

export default function ClaudeAutomationList() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<SessionTab>('sessions');
  const [selectedSession, setSelectedSession] = useState<{ adapterId: string; sessionId: string } | null>(null);
  const previousRef = useRef<Map<string, ClaudeAutomationSession> | undefined>(undefined);
  const query = useQuery({
    queryKey: ['claudeAutomationSessions'],
    queryFn: () => claudeAutomationApi.listSessions(),
  });
  const sessions = useMemo(() => query.data?.data?.items ?? [], [query.data]);
  const onSocketMessage = useCallback((message: ClaudeAutomationSocketMessage) => {
    if (!message.session) return;
    queryClient.setQueryData<ApiListResponse<ClaudeAutomationSession>>(
      ['claudeAutomationSessions'],
      (current) => {
        if (!current) return current;
        const exists = current.data.items.some((session) => sessionKey(session.adapterId, session.id) === sessionKey(message.session!.adapterId, message.session!.id));
        const items = exists
          ? current.data.items.map((session) => sessionKey(session.adapterId, session.id) === sessionKey(message.session!.adapterId, message.session!.id) ? message.session! : session)
          : [message.session!, ...current.data.items];
        return { ...current, data: { ...current.data, items, total: items.length } };
      },
    );
  }, [queryClient]);
  useClaudeAutomationSocket('*', { onMessage: onSocketMessage });

  useEffect(() => {
    const current = new Map(sessions.map((session) => [sessionKey(session.adapterId, session.id), session]));
    const previous = previousRef.current;
    if (previous) {
      sessions.forEach((session) => {
        const before = previous.get(sessionKey(session.adapterId, session.id));
        const title = session.title || session.prompt || session.id;
        const description = notificationPreview(session.lastAssistantMessage, 'Claude 已完成本轮回复');
        if (before?.status === 'running' && session.status === 'completed') {
          const key = `${sessionKey(session.adapterId, session.id)}:completed`;
          notification.success({
            key,
            message: title,
            description,
            placement: 'topRight',
            duration: false,
            closable: false,
            actions: <Space>
              <Button size="small" onClick={() => setSelectedSession({ adapterId: session.adapterId, sessionId: session.id })}>详情</Button>
              <Button size="small" type="primary" onClick={() => notification.destroy(key)}>确认</Button>
              <Button size="small" onClick={() => notification.destroy()}>全部关闭</Button>
            </Space>,
          });
        } else if (before?.status !== 'waiting' && session.status === 'waiting') {
          const key = `${sessionKey(session.adapterId, session.id)}:waiting`;
          notification.warning({
            key,
            message: title,
            description: '需要用户选择',
            placement: 'topRight',
            duration: false,
            closable: false,
            actions: <Space>
              <Button size="small" onClick={() => setSelectedSession({ adapterId: session.adapterId, sessionId: session.id })}>详情</Button>
              <Button size="small" type="primary" onClick={() => notification.destroy(key)}>确认</Button>
              <Button size="small" onClick={() => notification.destroy()}>全部关闭</Button>
            </Space>,
          });
        }
      });
    }
    previousRef.current = current;
  }, [notification, sessions]);

  const visibleSessions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle
      ? sessions.filter((session) =>
          [session.id, session.title, session.prompt, session.project?.name, session.project?.path]
            .some((value) => value?.toLowerCase().includes(needle)),
        )
      : sessions;
  }, [search, sessions]);
  const tasks = visibleSessions.filter((session) => session.status === 'running' || session.status === 'waiting');
  const waiting = sessions.filter((session) => session.status === 'waiting').length;

  return (
    <PageContainer
      title="Claude Automation"
      subTitle="Monitor automation sessions grouped by project"
      loading={query.isLoading}
      loadingVariant="cards"
      error={query.isError ? query.error as Error : null}
      onRetry={() => query.refetch()}
      extra={<Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>Refresh</Button>}
      className="automation-list-page"
    >
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as SessionTab)}
        items={[
          { key: 'sessions', label: 'Sessions' },
          { key: 'tasks', label: <Badge count={waiting} size="small" offset={[8, 0]}>Tasks</Badge> },
        ]}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search projects or sessions…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="automation-search"
      />
      {tab === 'sessions'
        ? <SessionGroups sessions={visibleSessions} empty={search ? 'No matching sessions' : 'No automation sessions'} onOpen={(adapterId, sessionId) => setSelectedSession({ adapterId, sessionId })} />
        : <SessionGroups sessions={tasks} empty={search ? 'No matching active tasks' : 'No running or waiting tasks'} onOpen={(adapterId, sessionId) => setSelectedSession({ adapterId, sessionId })} />}
      <Modal
        open={!!selectedSession}
        onCancel={() => setSelectedSession(null)}
        footer={null}
        title={null}
        width="min(94vw, 1180px)"
        centered
        destroyOnHidden
        className="automation-session-modal"
        styles={{ body: { padding: 0, maxHeight: 'min(88vh, 900px)', overflow: 'hidden' } }}
      >
        {selectedSession ? (
          <ClaudeAutomationSessionDetail
            adapterId={selectedSession.adapterId}
            sessionId={selectedSession.sessionId}
            embedded
            headerExtra={(
              <Button
                icon={<ExpandOutlined />}
                onClick={() => navigate(`/claude-automation/sessions/${encodeURIComponent(selectedSession.adapterId)}/${encodeURIComponent(selectedSession.sessionId)}`)}
              >
                Full page
              </Button>
            )}
          />
        ) : null}
      </Modal>
    </PageContainer>
  );
}
