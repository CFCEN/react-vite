/** 配置文件列表项 */
export interface ConfigFileItem {
  id: number;
  name: string;
  path: string;
  description: string;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

/** 配置文件详情 */
export interface ConfigFileDetail extends ConfigFileItem {
  content: string;
  size: number;
  modifiedAt: string;
}

/** 创建配置文件请求 */
export interface CreateConfigRequest {
  name: string;
  path: string;
  description?: string;
  groupName?: string;
}

/** 修改配置文件请求 */
export interface UpdateConfigRequest {
  name?: string;
  path?: string;
  description?: string;
  groupName?: string;
  content?: string;
}
