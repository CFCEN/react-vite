import { createElement } from 'react';
import Layout from '@/layout';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import userRoutes from './user';
import homeRoutes from './home';
import cardRoutes from './card';

import type { Route } from '@/router/types';
/**
 * 根路由配置
 * children: 都是一级路由
 * 注意：根路由代表的是一个具体的app，例如：小星云平台，物联网平台，等等
 */
export const layoutRoute: Route = {
  path: '/',
  Component: Layout,
  children: [userRoutes, homeRoutes, cardRoutes],
  name: 'layout',
  showInMenu: false,
};

export const rootRoutes: Route[] = [
  {
    path: '/',
    element: createElement(Navigate, { to: '/home/info', replace: true }),
    name: 'rootRedirect',
    showInMenu: false,
  },
  layoutRoute,
];

export default createBrowserRouter(rootRoutes as RouteObject[]);
