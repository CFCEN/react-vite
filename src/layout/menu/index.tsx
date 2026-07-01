import { Menu as AntMenu } from 'antd';
import type { MenuProps } from 'antd';
import { layoutRoute } from '@/router/routes';
import type { Route } from '@/router/types';
import { useLocation, useNavigate } from 'react-router';
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
    return `group-${parentKey}-${routeKey}`;
  }

  return route.path || `route-${parentKey}-${routeKey}`;
};

const sortRoutes = (routes: Route[]) => {
  return [...routes].sort((a, b) => (a.key ?? 0) - (b.key ?? 0));
};

const isPathMatch = (routePath: string, pathname: string) => {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
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
  ancestorKeys: string[] = []
): ActiveMenuState => {
  let bestMatch: ActiveMenuState = {
    selectedKey: undefined,
    openKeys: [],
    matchedPathLength: -1,
  };

  sortRoutes(routes).forEach((route, index) => {
    const key = getMenuKey(route, index, parentKey);

    if (route.children?.length) {
      const childMatch = findActiveMenuState(route.children, pathname, key, [
        ...ancestorKeys,
        key,
      ]);
      if (childMatch.matchedPathLength > bestMatch.matchedPathLength) {
        bestMatch = childMatch;
      }
      return;
    }

    if (
      route.path &&
      isPathMatch(route.path, pathname) &&
      route.path.length > bestMatch.matchedPathLength
    ) {
      bestMatch = {
        selectedKey: key,
        openKeys: ancestorKeys,
        matchedPathLength: route.path.length,
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
