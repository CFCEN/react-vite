/** Git 状态 */
export type GitStatus = 'Clean' | 'Modified' | 'Untracked' | 'Ahead' | 'Behind' | 'UNKNOWN';

/** Git 项目列表项 */
export interface GitProjectItem {
  id: number;
  name: string;
  path: string;
  branch: string;
  remote: string;
  status: GitStatus;
  lastCommit: string;
  groupId: number | null;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

/** Git 项目详情 */
export interface GitProjectDetail extends GitProjectItem {
  ragPath: string;
  indexPath: string;
}

/** 扫描发现的 Git 项目 */
export interface GitScanItem {
  name: string;
  path: string;
  branch: string;
  remote: string;
}

/** Git 分组 */
export interface GitGroup {
  id: number;
  name: string;
  description: string;
  ragPath: string;
  indexPath: string;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 扫描请求 */
export interface GitScanRequest {
  path: string;
  maxDepth?: number;
}

/** 加入分组请求 */
export interface AssignGroupRequest {
  groupId: number;
}

/** 批量加入分组请求 */
export interface BatchAssignGroupRequest {
  projectIds: number[];
  groupId: number;
}
