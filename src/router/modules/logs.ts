import type { Route } from '@/router/types';
import { FileTextOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const LogList = lazy(() => import('@/pages/logs/list'));
const LogGroups = lazy(() => import('@/pages/logs/groups'));
const LogDetail = lazy(() => import('@/pages/logs/detail'));

const routes: Route = {
  name: 'Logs',
  icon: createElement(FileTextOutlined),
  key: 30,
  path: '/logs',
  children: [
    {
      key: 31,
      index: true,
      Component: LogList,
      name: '日志列表',
      showInMenu: false,
    },
    {
      key: 32,
      path: '/logs/groups',
      Component: LogGroups,
      name: '日志分组',
      showInMenu: false,
    },
    {
      key: 33,
      path: '/logs/:id',
      Component: LogDetail,
      name: '日志详情',
      showInMenu: false,
    },
  ],
};

export default routes;
