import type { Route } from '@/router/types';
import { ControlOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const Beta = lazy(() => import('@/pages/beta'));

const routes: Route = {
  name: 'Beta（试验田）',
  icon: createElement(ControlOutlined),
  key: 70,
  path: '/beta',
  Component: Beta,
  meta: {
    title: 'Beta（试验田）',
    breadcrumb: 'Beta（试验田）',
  },
};

export default routes;
