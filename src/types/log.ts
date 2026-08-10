/** Log group */
export interface LogGroup {
  id: number;
  name: string;
  description: string;
  /** Present when backend supports it; API layer may fill via join */
  fileCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Log file list item */
export interface LogFileItem {
  id: number;
  name: string;
  path: string;
  groupId: number | null;
  /** Present when backend supports it; API layer may fill via join */
  groupName?: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** Log file content (tail) */
export interface LogContent {
  content: string;
  size: number;
  modifiedAt: string;
  /** Total lines in file (backend may omit until line-tail lands) */
  totalLines?: number;
  /** Lines returned in this response */
  returnedLines?: number;
  /** True when content was truncated to the requested tail */
  truncated?: boolean;
}

/** Create log group request */
export interface CreateLogGroupRequest {
  name: string;
  description?: string;
}

/** Create log file request */
export interface CreateLogFileRequest {
  name: string;
  path: string;
  groupId?: number;
  description?: string;
}
