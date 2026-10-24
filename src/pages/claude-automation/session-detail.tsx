import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Empty, Input, Segmented, Space, Switch, Typography } from 'antd';
import { ReloadOutlined, SendOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { claudeAutomationApi, normalizeEvents } from '@/api/claudeAutomationApi';
import { ErrorState, LoadingSkeleton, StatusDot, StatusTag, TimeText } from '@/components';
import { useClaudeAutomationSocket } from '@/hooks';
import type {
  ClaudeAutomationDecision,
  ClaudeAutomationEvent,
  ClaudeAutomationOperation,
  ClaudeAutomationPendingAction,
  ClaudeAutomationSocketMessage,
} from '@/types/claudeAutomation';
import '@uiw/react-markdown-preview/markdown.css';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
type EventView = 'preview' | 'source';

type MessageBlock = {
  type?: string;
  text?: string;
  content?: unknown;
};

export interface ClaudeAutomationSessionDetailProps {
  adapterId: string;
  sessionId: string;
  embedded?: boolean;
  headerExtra?: React.ReactNode;
}

function rawEventData(event: ClaudeAutomationEvent): unknown {
  return event.data ?? event.message ?? event.content ?? null;
}

function eventMessage(event: ClaudeAutomationEvent): { role: string; content: unknown } | null {
  const data = rawEventData(event);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as { role?: unknown; content?: unknown; message?: unknown };
  const value = record.message && typeof record.message === 'object' && !Array.isArray(record.message)
    ? record.message as { role?: unknown; content?: unknown }
    : record;
  return typeof value.role === 'string' ? { role: value.role, content: value.content } : null;
}

function blockText(block: MessageBlock): string {
  if (typeof block.text === 'string') return block.text;
  if (typeof block.content === 'string') return block.content;
  if (Array.isArray(block.content)) return messageText(block.content);
  return '';
}

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((block): block is MessageBlock =>
        !!block && typeof block === 'object'
        && ((block as MessageBlock).type === 'text' || (block as MessageBlock).type === 'tool_result'))
      .map(blockText)
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function isToolResult(event: ClaudeAutomationEvent): boolean {
  const message = eventMessage(event);
  if (message?.role === 'user' && Array.isArray(message.content)) {
    return message.content.some((block) =>
      !!block && typeof block === 'object' && (block as MessageBlock).type === 'tool_result');
  }
  return event.type.toLowerCase().includes('tool') || event.type.toLowerCase().includes('result');
}

function PendingActionCard({ action, pending, onRespond }: {
  action: ClaudeAutomationPendingAction;
  pending: boolean;
  onRespond: (actionId: string, decision: ClaudeAutomationDecision) => void;
}) {
  const isContinue = action.type === 'continue';
  return (
    <Card className={`automation-action automation-action--${action.type}`} size="small">
      <Title level={5}>{action.title || (isContinue ? 'Continue session?' : `${action.type} approval required`)}</Title>
      {action.description ? <Paragraph>{action.description}</Paragraph> : null}
      {action.toolName ? <Text code>{action.toolName}</Text> : null}
      {action.plan ? <pre>{action.plan}</pre> : null}
      {action.input != null ? <pre>{JSON.stringify(action.input, null, 2)}</pre> : null}
      <Space wrap>
        {isContinue ? (
          <Button type="primary" loading={pending} onClick={() => onRespond(action.id, 'continue')}>Continue</Button>
        ) : (
          <>
            <Button type="primary" loading={pending} onClick={() => onRespond(action.id, 'approve')}>Approve</Button>
            <Button danger disabled={pending} onClick={() => onRespond(action.id, 'reject')}>Reject</Button>
          </>
        )}
      </Space>
    </Card>
  );
}

const PreviewEvent = memo(function PreviewEvent({ event }: { event: ClaudeAutomationEvent }) {
  const message = eventMessage(event);
  const content = messageText(message?.content ?? rawEventData(event));
  if (!content) return null;
  const toolResult = isToolResult(event);
  const role = message?.role === 'assistant' ? 'assistant' : toolResult ? 'tool' : 'user';
  return (
    <article className={`automation-conversation automation-conversation--${role}`}>
      <div className="automation-conversation__meta">
        <Text className="mono">{role === 'tool' ? 'tool result' : role}</Text>
        <TimeText value={event.createdAt} relative={false} />
      </div>
      <div className="automation-conversation__body">
        <MarkdownPreview source={content} style={{ background: 'transparent', color: 'inherit' }} />
      </div>
    </article>
  );
});

const SourceEvent = memo(function SourceEvent({ event }: { event: ClaudeAutomationEvent }) {
  return (
    <article className="automation-event">
      <div className="automation-event__meta"><Text className="mono">{event.type}</Text><TimeText value={event.createdAt} relative={false} /></div>
      <pre>{JSON.stringify(rawEventData(event), null, 2)}</pre>
    </article>
  );
});

function MessageComposer({
  disabled,
  pending,
  onSend,
}: {
  disabled: boolean;
  pending: boolean;
  onSend: (content: string) => void;
}) {
  const [draft, setDraft] = useState('');

  const send = () => {
    const content = draft.trim();
    if (content && !pending) {
      onSend(content);
      setDraft('');
    }
  };

  return (
    <div className="automation-composer">
      <TextArea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onPressEnter={(event) => {
          if (!event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        placeholder="Send a message to continue this session…"
        autoSize={{ minRows: 2, maxRows: 6 }}
        disabled={disabled || pending}
        aria-label="Message"
      />
      <Button type="primary" icon={<SendOutlined />} loading={pending} disabled={!draft.trim() || disabled} onClick={send}>Send</Button>
    </div>
  );
}

export function ClaudeAutomationSessionDetail({ adapterId, sessionId, embedded = false, headerExtra }: ClaudeAutomationSessionDetailProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const viewerRef = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  const [view, setView] = useState<EventView>('preview');
  const [socketEvents, setSocketEvents] = useState<ClaudeAutomationEvent[]>([]);
  const [loadedEvents, setLoadedEvents] = useState<ClaudeAutomationEvent[]>([]);
  const [hasOlderEvents, setHasOlderEvents] = useState(false);
  const [olderCursor, setOlderCursor] = useState<number | undefined>();
  const [loadingOlderEvents, setLoadingOlderEvents] = useState(false);
  const [latestOperation, setLatestOperation] = useState<ClaudeAutomationOperation | null>(null);

  useEffect(() => {
    setSocketEvents([]);
    setLoadedEvents([]);
    setHasOlderEvents(false);
    setOlderCursor(undefined);
    setLoadingOlderEvents(false);
    setLatestOperation(null);
    setFollow(true);
  }, [adapterId, sessionId]);

  const detailQuery = useQuery({
    queryKey: ['claudeAutomationSession', adapterId, sessionId],
    queryFn: () => claudeAutomationApi.getSession(adapterId, sessionId),
    refetchOnMount: 'always',
  });
  const eventsQuery = useQuery({
    queryKey: ['claudeAutomationEvents', adapterId, sessionId],
    queryFn: () => claudeAutomationApi.listEvents(adapterId, sessionId, { limit: 50 }),
    refetchOnMount: 'always',
  });
  const operationsQuery = useQuery({
    queryKey: ['claudeAutomationOperations', adapterId, sessionId],
    queryFn: () => claudeAutomationApi.listOperations(adapterId, sessionId),
    refetchOnMount: 'always',
  });

  const invalidateSession = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['claudeAutomationSession', adapterId, sessionId] });
    void queryClient.invalidateQueries({ queryKey: ['claudeAutomationEvents', adapterId, sessionId] });
    void queryClient.invalidateQueries({ queryKey: ['claudeAutomationOperations', adapterId, sessionId] });
    void queryClient.invalidateQueries({ queryKey: ['claudeAutomationSessions'] });
  }, [adapterId, queryClient, sessionId]);

  const onSocketMessage = useCallback((payload: ClaudeAutomationSocketMessage) => {
    if (payload.operation) {
      setLatestOperation(payload.operation);
      void queryClient.invalidateQueries({ queryKey: ['claudeAutomationOperations', adapterId, sessionId] });
    }
    if (payload.event) {
      setSocketEvents((current) => current.some((item) => item.id === payload.event!.id) ? current : [...current, payload.event!]);
    }
    if (payload.session) {
      queryClient.setQueryData(['claudeAutomationSession', adapterId, sessionId], { data: payload.session });
      void queryClient.invalidateQueries({ queryKey: ['claudeAutomationSessions'] });
    } else if (payload.type !== 'ping') {
      void queryClient.invalidateQueries({ queryKey: ['claudeAutomationSession', adapterId, sessionId] });
    }
  }, [adapterId, queryClient, sessionId]);
  const socket = useClaudeAutomationSocket(sessionId, { adapterId, onMessage: onSocketMessage, onResync: invalidateSession });

  const fetchedPage = normalizeEvents(eventsQuery.data?.data);
  useEffect(() => {
    if (!eventsQuery.data?.data) return;
    setLoadedEvents(fetchedPage.items);
    setHasOlderEvents(fetchedPage.hasMore ?? false);
    setOlderCursor(fetchedPage.nextBefore ?? undefined);
  }, [eventsQuery.data?.data, fetchedPage.hasMore, fetchedPage.items]);

  const loadOlderEvents = useCallback(async () => {
    if (loadingOlderEvents || !hasOlderEvents || loadedEvents.length === 0) return;
    const viewer = viewerRef.current;
    const previousHeight = viewer?.scrollHeight ?? 0;
    const previousTop = viewer?.scrollTop ?? 0;
    setLoadingOlderEvents(true);
    try {
      const page = await claudeAutomationApi.listEvents(adapterId, sessionId, { before: olderCursor, limit: 50 });
      const older = normalizeEvents(page.data).items;
      setLoadedEvents((current) => {
        const merged = new Map([...older, ...current].map((event) => [event.id, event]));
        return Array.from(merged.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      });
      setHasOlderEvents(page.data?.hasMore ?? false);
      setOlderCursor(page.data?.nextBefore ?? undefined);
      requestAnimationFrame(() => {
        if (viewer) viewer.scrollTop = previousTop + viewer.scrollHeight - previousHeight;
      });
    } finally {
      setLoadingOlderEvents(false);
    }
  }, [adapterId, hasOlderEvents, loadedEvents.length, loadingOlderEvents, olderCursor, sessionId]);

  const events = useMemo(() => {
    const merged = new Map([...loadedEvents, ...socketEvents].map((event) => [event.id, event]));
    return Array.from(merged.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }, [loadedEvents, socketEvents]);

  useEffect(() => {
    if (!follow) return;
    requestAnimationFrame(() => viewerRef.current?.scrollTo({ top: viewerRef.current.scrollHeight }));
  }, [events, follow, view]);

  const responseMutation = useMutation({
    mutationFn: ({ actionId, decision }: { actionId: string; decision: ClaudeAutomationDecision }) =>
      claudeAutomationApi.respond(adapterId, sessionId, actionId, decision),
    onSuccess: () => {
      message.success('Response sent');
      invalidateSession();
    },
  });
  const messageMutation = useMutation({
    mutationFn: (content: string) => claudeAutomationApi.sendMessage(adapterId, sessionId, { content }),
    onSuccess: () => {
      setFollow(true);
      invalidateSession();
    },
  });

  const session = detailQuery.data?.data;
  const operations = operationsQuery.data?.data ?? [];
  const operation = latestOperation ?? operations[operations.length - 1];
  const pendingActions = session?.pendingActions ?? (session?.pendingAction ? [session.pendingAction] : []);
  const conn = connectionStatus[socket.status];
  const refresh = () => {
    void detailQuery.refetch();
    void eventsQuery.refetch();
    void operationsQuery.refetch();
  };
  const send = useCallback((content: string) => {
    if (!messageMutation.isPending) messageMutation.mutate(content);
  }, [messageMutation]);

  if (detailQuery.isLoading) return <div className="automation-detail-state"><LoadingSkeleton variant="detail" /></div>;
  if (detailQuery.isError) return <div className="automation-detail-state"><ErrorState error={detailQuery.error as Error} onRetry={refresh} /></div>;
  if (!session) return <Empty description="Session not found" />;

  return (
    <div className={`automation-detail${embedded ? ' automation-detail--embedded' : ''}`}>
      <div className="automation-detail__header">
        <div className="automation-detail__titles">
          <Title level={embedded ? 4 : 3}>{session.title || 'Automation session'}</Title>
          <Text type="secondary">{session.project ? `${session.project.name}${session.project.path ? ` · ${session.project.path}` : ''}` : sessionId}</Text>
        </div>
        <Space wrap>
          <StatusDot status={conn.status} label={conn.label} pulse={socket.status === 'connected'} />
          <Button icon={<ReloadOutlined />} loading={detailQuery.isFetching || eventsQuery.isFetching || operationsQuery.isFetching} onClick={refresh}>Refresh</Button>
          {headerExtra}
        </Space>
      </div>
      <div className="automation-summary">
        <StatusTag status={session.status} kind="custom" label={session.status} />
        <Text type="secondary">Updated <TimeText value={session.updatedAt} /></Text>
        {session.model ? <Text code>{session.model}</Text> : null}
        <Text type="secondary" className="mono">{session.id}</Text>
      </div>
      {operation ? <Alert type={operation.status === 'failed' ? 'error' : operation.status === 'busy' ? 'warning' : 'info'} showIcon message={`Operation: ${operation.status}`} description={operation.error || operation.message || undefined} /> : null}
      {pendingActions.length ? <div className="automation-actions">
        {pendingActions.map((action) => <PendingActionCard key={action.id} action={action} pending={responseMutation.isPending} onRespond={(actionId, decision) => responseMutation.mutate({ actionId, decision })} />)}
      </div> : null}
      <div className="automation-event-toolbar">
        <Title level={4}>Conversation</Title>
        <Space wrap>
          <Text type="secondary">{events.length} events</Text>
          <Segmented size="small" value={view} onChange={(value) => setView(value as EventView)} options={[{ label: 'Preview', value: 'preview' }, { label: 'Source', value: 'source' }]} />
          <Switch size="small" checked={follow} onChange={setFollow} />
          <Text>Follow</Text>
        </Space>
      </div>
      <div className="automation-event-shell">
        <div
          ref={viewerRef}
          className={`automation-event-stream automation-event-stream--${view}`}
          role="log"
          aria-live={follow ? 'polite' : 'off'}
          onScroll={(event) => {
            if (event.currentTarget.scrollTop <= 80) void loadOlderEvents();
          }}
        >
          {loadingOlderEvents ? <Text type="secondary">Loading older events…</Text> : null}
          {eventsQuery.isLoading && !events.length ? <Text type="secondary">Loading events…</Text> : null}
          {!eventsQuery.isLoading && !events.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No events yet" /> : events.map((event) => view === 'source' ? <SourceEvent key={event.id} event={event} /> : <PreviewEvent key={event.id} event={event} />)}
        </div>
        {!follow ? <Button className="automation-jump-bottom" type="primary" size="small" icon={<VerticalAlignBottomOutlined />} onClick={() => { setFollow(true); viewerRef.current?.scrollTo({ top: viewerRef.current.scrollHeight, behavior: 'smooth' }); }}>Resume follow</Button> : null}
      </div>
      <MessageComposer
        disabled={pendingActions.length > 0 || socket.status !== 'connected'}
        pending={messageMutation.isPending}
        onSend={send}
      />
    </div>
  );
}

const connectionStatus = {
  connected: { status: 'online' as const, label: 'Live' },
  connecting: { status: 'starting' as const, label: 'Connecting' },
  reconnecting: { status: 'warning' as const, label: 'Reconnecting' },
  offline: { status: 'offline' as const, label: 'Offline' },
  disconnected: { status: 'stopped' as const, label: 'Disconnected' },
};
