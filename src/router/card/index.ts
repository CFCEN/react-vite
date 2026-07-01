import type { Route } from '@/router/types';
import { CopyOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

// 懒加载
const Card = lazy(() => import('@/pages/card'));

const routes: Route = {
  name: '卡片',
  icon: createElement(CopyOutlined),
  key: 3,
  path: '/card',
  Component: Card,
};

export default routes;
