export type ClaudeAutomationSessionStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | string;

export type ClaudeAutomationActionType = 'permission' | 'plan' | 'continue';
export type ClaudeAutomationDecision = 'approve' | 'reject' | 'continue';

export interface ClaudeAutomationProject {
  id?: string;
  name: string;
  path?: string | null;
}

export interface ClaudeAutomationSession {
  adapterId: string;
  id: string;
  project: ClaudeAutomationProject;
  title?: string | null;
  prompt?: string | null;
  status: ClaudeAutomationSessionStatus;
  model?: string | null;
  lastAssistantMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  eventCount?: number;
  pendingAction?: ClaudeAutomationPendingAction | null;
  pendingActions?: ClaudeAutomationPendingAction[];
}

export interface ClaudeAutomationSessionDetail extends ClaudeAutomationSession {
  cwd?: string | null;
  result?: string | null;
  error?: string | null;
  pendingActions?: ClaudeAutomationPendingAction[];
}

export interface ClaudeAutomationPendingAction {
  id: string;
  type: ClaudeAutomationActionType;
  title?: string | null;
  description?: string | null;
  toolName?: string | null;
  input?: unknown;
  plan?: string | null;
  createdAt: string;
}

export interface ClaudeAutomationEvent {
  id: string;
  adapterId: string;
  sessionId: string;
  type: string;
  createdAt: string;
  message?: string | null;
  content?: string | null;
  data?: unknown;
}

export interface ClaudeAutomationEventsPage {
  items: ClaudeAutomationEvent[];
  total: number;
  hasMore?: boolean;
  nextBefore?: number | null;
  nextAfter?: string | null;
}

export interface ClaudeAutomationSendMessageRequest {
  content: string;
}

export interface ClaudeAutomationSendMessageResult {
  requestId: string;
  accepted: boolean;
}

export type ClaudeAutomationOperationStatus = 'accepted' | 'running' | 'completed' | 'failed' | 'busy' | string;

export interface ClaudeAutomationOperation {
  id?: string;
  type?: string;
  status: ClaudeAutomationOperationStatus;
  message?: string | null;
  error?: string | null;
}

export interface ClaudeAutomationSocketMessage {
  type: string;
  adapterId?: string;
  sessionId?: string;
  operation?: ClaudeAutomationOperation;
  event?: ClaudeAutomationEvent;
  session?: ClaudeAutomationSessionDetail;
  data?: unknown;
}

export type ClaudeAutomationSocketStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'disconnected';
