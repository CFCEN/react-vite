import type { Route } from '@/router/types';
import { SettingOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const ConfigList = lazy(() => import('@/pages/configurations/list'));
const ConfigDetail = lazy(() => import('@/pages/configurations/detail'));

const routes: Route = {
  name: 'Configuration',
  icon: createElement(SettingOutlined),
  key: 20,
  path: '/configurations',
  children: [
    {
      key: 21,
      index: true,
      Component: ConfigList,
      name: '配置列表',
      showInMenu: false,
    },
    {
      key: 22,
      path: '/configurations/:id',
      Component: ConfigDetail,
      name: '配置详情',
      showInMenu: false,
    },
  ],
};

export default routes;
