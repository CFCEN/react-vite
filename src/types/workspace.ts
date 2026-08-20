/** Index status */
export type IndexStatus = 'NOT_INDEXED' | 'INDEXING' | 'READY' | 'FAILED' | 'OUTDATED';

/** Project context */
export interface ProjectContext {
  id: number;
  groupId: number;
  name: string;
  ragPath: string;
  indexPath: string;
  indexStatus: IndexStatus;
  lastIndexedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present when backend joins group name; otherwise filled client-side */
  groupName?: string;
}

/** Workspace overview */
export interface WorkspaceOverview {
  root: string;
  ragDirs: string[];
  indexDirs: string[];
  contexts: ProjectContext[];
}

/** Create Context request */
export interface CreateContextRequest {
  name: string;
}

/** Update Context request */
export interface UpdateContextRequest {
  name?: string;
  ragPath?: string;
  indexPath?: string;
}

// ---------- Context document files ----------

/** File entry under a context directory */
export interface ContextFile {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modifiedAt: string;
}

/** File content payload */
export interface ContextFileContent {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

/** Create file request */
export interface CreateContextFileRequest {
  type: 'rag' | 'index';
  fileName: string;
  content: string;
}

/** Update file request */
export interface UpdateContextFileRequest {
  type: 'rag' | 'index';
  fileName: string;
  content: string;
}
