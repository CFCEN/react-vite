import type { Route } from '@/router/types';
import { SettingOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const ConfigList = lazy(() => import('@/pages/configurations/list'));
const ConfigDetail = lazy(() => import('@/pages/configurations/detail'));

const routes: Route = {
  name: 'Configurations',
  icon: createElement(SettingOutlined),
  key: 20,
  path: '/configurations',
  meta: {
    title: 'Configurations',
    breadcrumb: 'Configurations',
  },
  children: [
    {
      key: 21,
      index: true,
      Component: ConfigList,
      name: 'Config List',
      showInMenu: false,
      meta: {
        title: 'Configurations',
        breadcrumb: 'List',
        hideInBreadcrumb: true,
      },
    },
    {
      key: 22,
      path: '/configurations/:id',
      Component: ConfigDetail,
      name: 'Config Detail',
      showInMenu: false,
      meta: {
        title: 'Configuration Detail',
        breadcrumb: 'Detail',
        parentKey: '/configurations',
        parentPath: '/configurations',
        hideInMenu: true,
      },
    },
  ],
};

export default routes;
