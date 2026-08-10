import axios from 'axios';
import { message } from 'antd';

const BASE_URL = 'http://127.0.0.1:9527';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器：统一错误处理
client.interceptors.response.use(
  (response) => {
    // 直接返回 data 层，调用方无需重复 .data
    return response.data;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const response = error.response;
    if (response?.data?.error) {
      const { code, message: msg } = response.data.error;
      // 统一错误提示
      message.error(msg || `请求失败 [${code}]`);
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时，请检查后端服务是否启动');
    } else if (!response) {
      message.error('网络错误，无法连接到后端服务 (http://127.0.0.1:9527)');
    } else {
      message.error(`请求失败: ${error.message}`);
    }

    return Promise.reject(error);
  }
);

export default client;
