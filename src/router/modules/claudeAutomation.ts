import type { Route } from '@/router/types';
import { RobotOutlined } from '@ant-design/icons';
import { createElement, lazy } from 'react';

const SessionList = lazy(() => import('@/pages/claude-automation'));
const SessionDetail = lazy(() => import('@/pages/claude-automation/detail'));

const routes: Route = {
  name: 'Claude Automation',
  icon: createElement(RobotOutlined),
  key: 65,
  path: '/claude-automation',
  meta: { title: 'Claude Automation', breadcrumb: 'Claude Automation' },
  children: [
    {
      name: 'Sessions',
      key: 66,
      index: true,
      Component: SessionList,
      showInMenu: true,
      meta: { title: 'Claude Automation', breadcrumb: 'Sessions', parentPath: '/claude-automation', parentKey: '/claude-automation' },
    },
    {
      name: 'Session Detail',
      key: 67,
      path: '/claude-automation/sessions/:adapterId/:sessionId',
      Component: SessionDetail,
      showInMenu: false,
      meta: { title: 'Automation Session', breadcrumb: 'Session', hideInMenu: true, parentPath: '/claude-automation', parentKey: '/claude-automation' },
    },
  ],
};

export default routes;
