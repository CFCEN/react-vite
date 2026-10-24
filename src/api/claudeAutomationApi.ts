import client, { AUTOMATION_TOKEN } from './client';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  ClaudeAutomationDecision,
  ClaudeAutomationEvent,
  ClaudeAutomationEventsPage,
  ClaudeAutomationOperation,
  ClaudeAutomationSendMessageRequest,
  ClaudeAutomationSendMessageResult,
  ClaudeAutomationSession,
  ClaudeAutomationSessionDetail,
} from '@/types/claudeAutomation';

const base = '/api/claude-automation';
const auth = AUTOMATION_TOKEN ? { headers: { Authorization: `Bearer ${AUTOMATION_TOKEN}` } } : {};
const resource = (adapterId: string, sessionId: string) =>
  `${base}/adapters/${encodeURIComponent(adapterId)}/sessions/${encodeURIComponent(sessionId)}`;

export const sessionKey = (adapterId: string, sessionId: string) => `${adapterId}:${sessionId}`;

export const claudeAutomationApi = {
  listSessions: () => client.get<unknown, ApiListResponse<ClaudeAutomationSession>>(`${base}/sessions`, auth),
  getSession: (adapterId: string, sessionId: string) => client.get<unknown, ApiResponse<ClaudeAutomationSessionDetail>>(`${resource(adapterId, sessionId)}`, auth),
  listEvents: (adapterId: string, sessionId: string, params?: { after?: number; before?: number; limit?: number }) => client.get<unknown, ApiResponse<ClaudeAutomationEventsPage>>(`${resource(adapterId, sessionId)}/events`, { ...auth, params, silent: true }),
  listOperations: (adapterId: string, sessionId: string) => client.get<unknown, ApiResponse<ClaudeAutomationOperation[]>>(`${resource(adapterId, sessionId)}/operations`, { ...auth, silent: true }),
  sendMessage: (adapterId: string, sessionId: string, request: ClaudeAutomationSendMessageRequest) => client.post<unknown, ApiResponse<ClaudeAutomationSendMessageResult>>(`${resource(adapterId, sessionId)}/messages`, request, auth),
  respond: (adapterId: string, sessionId: string, actionId: string, decision: ClaudeAutomationDecision) => client.post<unknown, ApiResponse<ClaudeAutomationSessionDetail>>(`${resource(adapterId, sessionId)}/actions/${encodeURIComponent(actionId)}/respond`, { decision }, auth),
};

export function normalizeEvents(value: ClaudeAutomationEventsPage | ClaudeAutomationEvent[] | undefined): ClaudeAutomationEventsPage {
  if (Array.isArray(value)) return { items: value, total: value.length };
  return value ?? { items: [], total: 0 };
}
