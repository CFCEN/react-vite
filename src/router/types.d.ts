import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

export interface RouteMeta {
  /** Page title (document / header) */
  title?: string;
  /** Breadcrumb label (falls back to title / name) */
  breadcrumb?: string;
  /** Hide from breadcrumb trail */
  hideInBreadcrumb?: boolean;
  /** Hide from sider menu (alias of showInMenu: false) */
  hideInMenu?: boolean;
  /** Parent menu key for highlighting nested detail routes */
  parentKey?: string;
  /** Keep parent submenu open */
  parentPath?: string;
}

export type Route = Omit<RouteObject, 'children'> & {
  name: string;
  icon?: ReactNode;
  children?: Route[];
  key?: number;
  /** Whether to show in sider menu; default true unless false or meta.hideInMenu */
  showInMenu?: boolean;
  meta?: RouteMeta;
};
