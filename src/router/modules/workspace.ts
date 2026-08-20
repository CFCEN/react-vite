import type { Route } from '@/router/types';
import { Navigate } from 'react-router';
import {
  FolderOpenOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { createElement, lazy } from 'react';

const WorkspaceRag = lazy(() => import('@/pages/workspace/rag'));
const WorkspaceIndex = lazy(() => import('@/pages/workspace/index'));

const routes: Route = {
  name: 'Workspace',
  icon: createElement(FolderOpenOutlined),
  key: 60,
  path: '/workspace',
  meta: {
    title: 'Workspace',
    breadcrumb: 'Workspace',
  },
  children: [
    {
      key: 60,
      index: true,
      element: createElement(Navigate, { to: '/workspace/rag', replace: true }),
      name: 'redirect',
      showInMenu: false,
      meta: { hideInBreadcrumb: true, hideInMenu: true },
    },
    {
      key: 61,
      path: '/workspace/rag',
      Component: WorkspaceRag,
      name: 'RAG',
      icon: createElement(DatabaseOutlined),
      showInMenu: true,
      meta: {
        title: 'RAG',
        breadcrumb: 'RAG',
        parentPath: '/workspace',
      },
    },
    {
      key: 62,
      path: '/workspace/index',
      Component: WorkspaceIndex,
      name: 'Index',
      icon: createElement(ApartmentOutlined),
      showInMenu: true,
      meta: {
        title: 'Index',
        breadcrumb: 'Index',
        parentPath: '/workspace',
      },
    },
  ],
};

export default routes;
