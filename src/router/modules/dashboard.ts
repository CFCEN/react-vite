import type { Route } from '@/router/types';
import { HomeOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const Dashboard = lazy(() => import('@/pages/dashboard'));

const routes: Route = {
  name: 'Dashboard',
  icon: createElement(HomeOutlined),
  key: 10,
  path: '/dashboard',
  Component: Dashboard,
  meta: {
    title: 'Dashboard',
    breadcrumb: 'Dashboard',
  },
};

export default routes;
