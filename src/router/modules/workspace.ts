import type { Route } from '@/router/types';
import { Navigate } from 'react-router';
import { FolderOpenOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const WorkspaceRag = lazy(() => import('@/pages/workspace/rag'));
const WorkspaceIndex = lazy(() => import('@/pages/workspace/index'));

const routes: Route = {
  name: 'Workspace',
  icon: createElement(FolderOpenOutlined),
  key: 60,
  path: '/workspace',
  children: [
    {
      key: 60,
      index: true,
      element: createElement(Navigate, { to: '/workspace/rag', replace: true }),
      name: 'redirect',
      showInMenu: false,
    },
    {
      key: 61,
      path: '/workspace/rag',
      Component: WorkspaceRag,
      name: 'RAG',
      showInMenu: false,
    },
    {
      key: 62,
      path: '/workspace/index',
      Component: WorkspaceIndex,
      name: 'Index',
      showInMenu: false,
    },
  ],
};

export default routes;
