import type { Route } from '@/router/types';
import { ControlOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const Settings = lazy(() => import('@/pages/settings'));

const routes: Route = {
  name: 'Settings',
  icon: createElement(ControlOutlined),
  key: 70,
  path: '/settings',
  Component: Settings,
};

export default routes;
