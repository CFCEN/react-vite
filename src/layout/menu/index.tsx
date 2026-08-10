import { Menu as AntMenu } from 'antd';
import type { MenuProps } from 'antd';
import { layoutRoute } from '@/router/routes';
import type { Route } from '@/router/types';
import { useLocation, useNavigate, matchPath } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import './index.less';

type AntdMenuItems = NonNullable<MenuProps['items']>;

interface ActiveMenuState {
  selectedKey?: string;
  openKeys: string[];
  matchedPathLength: number;
}

const shouldShowInMenu = (route: Route) => route.showInMenu !== false;

const getMenuKey = (route: Route, index: number, parentKey: string) => {
  const routeKey = route.key ?? index;

  if (route.children?.length) {
    // 有子路由的父级菜单直接用 path 作为 key，保证点击时可以导航
    return route.path || `group-${parentKey}-${routeKey}`;
  }

  return route.path || `route-${parentKey}-${routeKey}`;
};

const sortRoutes = (routes: Route[]) => {
  return [...routes].sort((a, b) => (a.key ?? 0) - (b.key ?? 0));
};

/**
 * 检查路由是否匹配当前路径，返回匹配长度（-1 表示不匹配）
 * 使用 react-router 的 matchPath 支持参数化路径（:id 等）
 */
const getRouteMatchLength = (route: Route, pathname: string, parentPath?: string): number => {
  if (route.index) {
    // index 路由匹配父级路径
    return parentPath && pathname === parentPath ? parentPath.length : -1;
  }
  if (route.path) {
    const matched = matchPath(route.path, pathname);
    return matched ? route.path.length : -1;
  }
  return -1;
};

const buildMenuItems = (routes: Route[], parentKey: string): AntdMenuItems => {
  return sortRoutes(routes)
    .filter(shouldShowInMenu)
    .map<AntdMenuItems[number]>((route, index) => {
      const key = getMenuKey(route, index, parentKey);
      const children = route.children?.length
        ? buildMenuItems(route.children, key)
        : undefined;

      const baseItem = {
        key,
        icon: route.icon,
        label: route.name,
      };

      return children?.length ? { ...baseItem, children } : baseItem;
    });
};

const findActiveMenuState = (
  routes: Route[],
  pathname: string,
  parentKey: string,
  ancestorKeys: string[] = [],
  parentPath?: string,
): ActiveMenuState => {
  let bestMatch: ActiveMenuState = {
    selectedKey: undefined,
    openKeys: [],
    matchedPathLength: -1,
  };

  sortRoutes(routes).forEach((route, index) => {
    const key = getMenuKey(route, index, parentKey);
    // 当前层级路由的 path；有子路由时作为子级的 parentPath
    const currentParentPath = route.path || parentPath;

    if (route.children?.length) {
      const childMatch = findActiveMenuState(
        route.children,
        pathname,
        key,
        [...ancestorKeys, key],
        currentParentPath,
      );
      if (childMatch.matchedPathLength > bestMatch.matchedPathLength) {
        bestMatch = childMatch;
      }
      return;
    }

    // 叶子路由匹配（支持 index 路由和参数化路径）
    const matchLen = getRouteMatchLength(route, pathname, parentPath);
    if (matchLen > bestMatch.matchedPathLength) {
      bestMatch = {
        selectedKey: key,
        openKeys: ancestorKeys,
        matchedPathLength: matchLen,
      };
    }
  });

  return bestMatch;
};

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const menuRoutes = layoutRoute.children || [];

  const menuItems = useMemo(() => {
    return buildMenuItems(menuRoutes, 'root');
  }, [menuRoutes]);

  const activeMenuState = useMemo(() => {
    return findActiveMenuState(menuRoutes, pathname, 'root');
  }, [menuRoutes, pathname]);

  const [openKeys, setOpenKeys] = useState<string[]>(activeMenuState.openKeys);

  useEffect(() => {
    setOpenKeys(activeMenuState.openKeys);
  }, [activeMenuState.openKeys]);

  return (
    <AntMenu
      theme="light"
      mode="inline"
      inlineIndent={0}
      selectedKeys={
        activeMenuState.selectedKey ? [activeMenuState.selectedKey] : []
      }
      openKeys={openKeys}
      onOpenChange={(keys) => {
        setOpenKeys(keys as string[]);
      }}
      onClick={({ key }) => {
        const targetPath = String(key);
        if (targetPath.startsWith('/')) {
          navigate(targetPath);
        }
      }}
      className="menu-custom"
      style={{ height: 'calc(100vh - 100px)' }}
      items={menuItems}
    />
  );
};

export default Menu;
