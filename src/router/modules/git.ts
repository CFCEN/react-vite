import type { Route } from '@/router/types';
import { Navigate } from 'react-router';
import {
  BranchesOutlined,
  FolderOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { createElement, lazy } from 'react';

const GitProjects = lazy(() => import('@/pages/git/projects'));
const GitProjectDetail = lazy(() => import('@/pages/git/projectDetail'));
const GitGroups = lazy(() => import('@/pages/git/groups'));
const GitGroupDetail = lazy(() => import('@/pages/git/groupDetail'));

const routes: Route = {
  name: 'Git',
  icon: createElement(BranchesOutlined),
  key: 50,
  path: '/git',
  meta: {
    title: 'Git',
    breadcrumb: 'Git',
  },
  children: [
    {
      key: 50,
      index: true,
      element: createElement(Navigate, { to: '/git/projects', replace: true }),
      name: 'redirect',
      showInMenu: false,
      meta: { hideInBreadcrumb: true, hideInMenu: true },
    },
    {
      key: 51,
      path: '/git/projects',
      Component: GitProjects,
      name: 'Projects',
      icon: createElement(FolderOutlined),
      showInMenu: true,
      meta: {
        title: 'Git Projects',
        breadcrumb: 'Projects',
        parentPath: '/git',
      },
    },
    {
      key: 52,
      path: '/git/projects/:id',
      Component: GitProjectDetail,
      name: 'Project Detail',
      showInMenu: false,
      meta: {
        title: 'Project Detail',
        breadcrumb: 'Detail',
        hideInMenu: true,
        parentKey: '/git/projects',
        parentPath: '/git',
      },
    },
    {
      key: 53,
      path: '/git/groups',
      Component: GitGroups,
      name: 'Groups',
      icon: createElement(ClusterOutlined),
      showInMenu: true,
      meta: {
        title: 'Git Groups',
        breadcrumb: 'Groups',
        parentPath: '/git',
      },
    },
    {
      key: 54,
      path: '/git/groups/:id',
      Component: GitGroupDetail,
      name: 'Group Detail',
      showInMenu: false,
      meta: {
        title: 'Group Detail',
        breadcrumb: 'Detail',
        hideInMenu: true,
        parentKey: '/git/groups',
        parentPath: '/git',
      },
    },
  ],
};

export default routes;
