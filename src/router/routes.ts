import { createElement } from 'react';
import Layout from '@/layout';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import cardRoutes from './card';
import dashboardRoutes from './modules/dashboard';
import configurationRoutes from './modules/configurations';
import logRoutes from './modules/logs';
import applicationRoutes from './modules/applications';
import gitRoutes from './modules/git';
import workspaceRoutes from './modules/workspace';
import settingsRoutes from './modules/settings';

import type { Route } from '@/router/types';

/**
 * layoutRoute: 所有需要侧边栏布局的一级路由
 * children 中的每个 Route 按 key 排序后作为菜单项
 */
export const layoutRoute: Route = {
  path: '/',
  Component: Layout,
  children: [
    dashboardRoutes,
    configurationRoutes,
    logRoutes,
    applicationRoutes,
    gitRoutes,
    workspaceRoutes,
    cardRoutes,
    settingsRoutes,
  ],
  name: 'layout',
  showInMenu: false,
};

export const rootRoutes: Route[] = [
  {
    path: '/',
    element: createElement(Navigate, { to: '/dashboard', replace: true }),
    name: 'rootRedirect',
    showInMenu: false,
  },
  layoutRoute,
];

export default createBrowserRouter(rootRoutes as RouteObject[]);
