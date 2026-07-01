import Home from '@/pages/home';
import KanbanBoard from '@/pages/home/kanhban';
import {
  DashboardOutlined,
  HomeOutlined,
  InfoOutlined,
} from '@ant-design/icons';
import type { Route } from '@/router/types';
import { createElement } from 'react';
import { Navigate } from 'react-router';

const childrenRoutes = [
  {
    key: 0,
    index: true,
    element: createElement(Navigate, { to: 'info', replace: true }),
    name: '首页默认跳转',
    showInMenu: false,
  },
  {
    key: 1,
    path: '/home/info',
    Component: Home,
    name: '信息',
    icon: createElement(InfoOutlined),
  },
  {
    key: 2,
    path: '/home/kanban',
    Component: KanbanBoard,
    name: '看板',
    icon: createElement(DashboardOutlined),
  },
];

const routes: Route = {
  name: '主页',
  icon: createElement(HomeOutlined),
  key: 1,
  path: '/home',
  children: childrenRoutes,
};

export default routes;
