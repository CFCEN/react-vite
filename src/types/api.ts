/** 统一 API 响应 - 单条数据 */
export interface ApiResponse<T> {
  data: T;
}

/** 统一 API 响应 - 列表数据 */
export interface ApiListResponse<T> {
  data: {
    items: T[];
    total: number;
  };
}

/** 统一 API 错误响应 */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
