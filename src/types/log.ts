/** 日志分组 */
export interface LogGroup {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** 日志文件 */
export interface LogFileItem {
  id: number;
  name: string;
  path: string;
  groupId: number | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** 日志内容 */
export interface LogContent {
  content: string;
  size: number;
  modifiedAt: string;
}

/** 创建日志分组请求 */
export interface CreateLogGroupRequest {
  name: string;
  description?: string;
}

/** 创建日志文件请求 */
export interface CreateLogFileRequest {
  name: string;
  path: string;
  groupId?: number;
  description?: string;
}
