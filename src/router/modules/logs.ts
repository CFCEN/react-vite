import type { Route } from '@/router/types';
import { FileTextOutlined, ClusterOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const LogList = lazy(() => import('@/pages/logs/list'));
const LogGroups = lazy(() => import('@/pages/logs/groups'));
const LogDetail = lazy(() => import('@/pages/logs/detail'));

const routes: Route = {
  name: 'Logs',
  icon: createElement(FileTextOutlined),
  key: 30,
  path: '/logs',
  meta: {
    title: 'Logs',
    breadcrumb: 'Logs',
  },
  children: [
    {
      key: 31,
      index: true,
      Component: LogList,
      name: 'Files',
      icon: createElement(UnorderedListOutlined),
      showInMenu: true,
      meta: {
        title: 'Log Files',
        breadcrumb: 'Files',
        parentPath: '/logs',
        parentKey: '/logs',
      },
    },
    {
      key: 32,
      path: '/logs/groups',
      Component: LogGroups,
      name: 'Groups',
      icon: createElement(ClusterOutlined),
      showInMenu: true,
      meta: {
        title: 'Log Groups',
        breadcrumb: 'Groups',
        parentPath: '/logs',
      },
    },
    {
      key: 33,
      path: '/logs/:id',
      Component: LogDetail,
      name: 'Log Detail',
      showInMenu: false,
      meta: {
        title: 'Log Detail',
        breadcrumb: 'Detail',
        parentKey: '/logs',
        parentPath: '/logs',
        hideInMenu: true,
        hideInBreadcrumb: false,
      },
    },
  ],
};

export default routes;
