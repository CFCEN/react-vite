/** Index 状态 */
export type IndexStatus = 'NOT_INDEXED' | 'INDEXING' | 'READY' | 'FAILED' | 'OUTDATED';

/** 项目上下文 */
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
}

/** 工作区概览 */
export interface WorkspaceOverview {
  root: string;
  ragDirs: string[];
  indexDirs: string[];
  contexts: ProjectContext[];
}

/** 创建 Context 请求 */
export interface CreateContextRequest {
  name: string;
}

/** 修改 Context 请求 */
export interface UpdateContextRequest {
  name?: string;
  ragPath?: string;
  indexPath?: string;
}

// ---------- Context 文档文件 ----------

/** Context 目录下的文件项 */
export interface ContextFile {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modifiedAt: string;
}

/** 文件内容 */
export interface ContextFileContent {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

/** 创建文件请求 */
export interface CreateContextFileRequest {
  type: 'rag' | 'index';
  fileName: string;
  content: string;
}

/** 修改文件请求 */
export interface UpdateContextFileRequest {
  type: 'rag' | 'index';
  fileName: string;
  content: string;
}
