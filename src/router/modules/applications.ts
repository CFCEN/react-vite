import type { Route } from '@/router/types';
import { CodeOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const ApplicationList = lazy(() => import('@/pages/applications'));
const ApplicationForm = lazy(() => import('@/pages/applications/form'));
const ApplicationDetail = lazy(() => import('@/pages/applications/detail'));

const routes: Route = {
  name: 'Applications',
  icon: createElement(CodeOutlined),
  key: 40,
  path: '/applications',
  meta: {
    title: 'Applications',
    breadcrumb: 'Applications',
  },
  children: [
    {
      key: 41,
      index: true,
      Component: ApplicationList,
      name: 'Application List',
      showInMenu: false,
      meta: {
        title: 'Applications',
        hideInBreadcrumb: true,
      },
    },
    {
      key: 42,
      path: '/applications/new',
      Component: ApplicationForm,
      name: 'New Application',
      showInMenu: false,
      meta: {
        title: 'New Application',
        breadcrumb: 'New',
        parentKey: '/applications',
        parentPath: '/applications',
      },
    },
    {
      key: 43,
      path: '/applications/:id',
      Component: ApplicationDetail,
      name: 'Application Detail',
      showInMenu: false,
      meta: {
        title: 'Application Detail',
        breadcrumb: 'Detail',
        parentKey: '/applications',
        parentPath: '/applications',
      },
    },
    {
      key: 44,
      path: '/applications/:id/edit',
      Component: ApplicationForm,
      name: 'Edit Application',
      showInMenu: false,
      meta: {
        title: 'Edit Application',
        breadcrumb: 'Edit',
        parentKey: '/applications',
        parentPath: '/applications',
      },
    },
  ],
};

export default routes;
