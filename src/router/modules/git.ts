import type { Route } from '@/router/types';
import { Navigate } from 'react-router';
import { BranchesOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const GitProjects = lazy(() => import('@/pages/git/projects'));
const GitProjectDetail = lazy(() => import('@/pages/git/projectDetail'));
const GitGroups = lazy(() => import('@/pages/git/groups'));
const GitGroupDetail = lazy(() => import('@/pages/git/groupDetail'));

const routes: Route = {
  name: 'Git Projects',
  icon: createElement(BranchesOutlined),
  key: 50,
  path: '/git',
  children: [
    {
      key: 50,
      index: true,
      element: createElement(Navigate, { to: '/git/projects', replace: true }),
      name: 'redirect',
      showInMenu: false,
    },
    {
      key: 51,
      path: '/git/projects',
      Component: GitProjects,
      name: '项目列表',
      showInMenu: false,
    },
    {
      key: 52,
      path: '/git/projects/:id',
      Component: GitProjectDetail,
      name: '项目详情',
      showInMenu: false,
    },
    {
      key: 53,
      path: '/git/groups',
      Component: GitGroups,
      name: '分组列表',
      showInMenu: false,
    },
    {
      key: 54,
      path: '/git/groups/:id',
      Component: GitGroupDetail,
      name: '分组详情',
      showInMenu: false,
    },
  ],
};

export default routes;
