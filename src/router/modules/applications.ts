import type { Route } from '@/router/types';
import { CodeOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const ApplicationList = lazy(() => import('@/pages/applications/list'));
const ApplicationForm = lazy(() => import('@/pages/applications/form'));
const ApplicationDetail = lazy(() => import('@/pages/applications/detail'));

const routes: Route = {
  name: 'Applications',
  icon: createElement(CodeOutlined),
  key: 40,
  path: '/applications',
  children: [
    {
      key: 41,
      index: true,
      Component: ApplicationList,
      name: '应用列表',
      showInMenu: false,
    },
    {
      key: 42,
      path: '/applications/new',
      Component: ApplicationForm,
      name: '新建应用',
      showInMenu: false,
    },
    {
      key: 43,
      path: '/applications/:id',
      Component: ApplicationDetail,
      name: '应用详情',
      showInMenu: false,
    },
    {
      key: 44,
      path: '/applications/:id/edit',
      Component: ApplicationForm,
      name: '编辑应用',
      showInMenu: false,
    },
  ],
};

export default routes;
