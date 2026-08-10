import { Menu as AntMenu, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { layoutRoute } from '@/router/routes';
import type { Route } from '@/router/types';
import { useLocation, useNavigate, matchPath } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import './index.less';

type AntdMenuItems = NonNullable<MenuProps['items']>;

/** Stable empty fallback — avoids `?? []` creating a new array identity each render. */
const EMPTY_ROUTES: Route[] = [];

interface ActiveMenuState {
  selectedKey?: string;
  openKeys: string[];
  matchedPathLength: number;
}

const shouldShowInMenu = (route: Route) =>
  route.showInMenu !== false && route.meta?.hideInMenu !== true;

const getMenuKey = (route: Route, index: number, parentKey: string, parentPath?: string) => {
  const routeKey = route.key ?? index;

  // Index route shown in menu → use parent path for navigation
  if (route.index && shouldShowInMenu(route) && parentPath) {
    return parentPath;
  }

  if (route.children?.length) {
    return route.path || `group-${parentKey}-${routeKey}`;
  }

  return route.path || route.meta?.parentKey || `route-${parentKey}-${routeKey}`;
};

const sortRoutes = (routes: Route[]) => {
  return [...routes].sort((a, b) => (a.key ?? 0) - (b.key ?? 0));
};

const getRouteMatchLength = (
  route: Route,
  pathname: string,
  parentPath?: string,
): number => {
  if (route.index) {
    return parentPath && pathname === parentPath ? parentPath.length : -1;
  }
  if (route.path) {
    const matched = matchPath({ path: route.path, end: true }, pathname);
    if (matched) return route.path.length;
    // Prefix match for detail routes highlighting parent menu item
    const parentKey = route.meta?.parentKey;
    if (parentKey && (pathname === parentKey || pathname.startsWith(`${parentKey}/`))) {
      return parentKey.length;
    }
  }
  return -1;
};

const buildMenuItems = (
  routes: Route[],
  parentKey: string,
  parentPath?: string,
  collapsed?: boolean,
): AntdMenuItems => {
  return sortRoutes(routes)
    .filter(shouldShowInMenu)
    .map<AntdMenuItems[number]>((route, index) => {
      const key = getMenuKey(route, index, parentKey, parentPath);
      const children = route.children?.length
        ? buildMenuItems(route.children, key, route.path, collapsed)
        : undefined;

      const labelNode =
        collapsed && !children?.length ? (
          <Tooltip title={route.name} placement="right">
            <span>{route.name}</span>
          </Tooltip>
        ) : (
          route.name
        );

      const baseItem = {
        key,
        icon: route.icon,
        label: labelNode,
        title: route.name, // native tooltip when collapsed via antd
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
    const key = getMenuKey(route, index, parentKey, parentPath);
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

      // Detail route under this parent: highlight meta.parentKey leaf if present
      const detailChild = route.children.find(
        (c) =>
          c.meta?.parentKey &&
          (pathname === c.meta.parentKey ||
            pathname.startsWith(`${c.meta.parentKey}/`) ||
            (c.path && matchPath({ path: c.path, end: true }, pathname))),
      );
      if (detailChild?.meta?.parentKey) {
        const parentMenuKey = detailChild.meta.parentKey;
        const len = parentMenuKey.length;
        if (len >= bestMatch.matchedPathLength) {
          bestMatch = {
            selectedKey: parentMenuKey,
            openKeys: [...ancestorKeys, key],
            matchedPathLength: len,
          };
        }
      }
      return;
    }

    // Hidden detail routes: highlight the parent menu leaf, never the :id path itself
    if (
      route.meta?.parentKey &&
      route.path &&
      matchPath({ path: route.path, end: true }, pathname)
    ) {
      const len = route.path.length;
      if (len > bestMatch.matchedPathLength) {
        bestMatch = {
          selectedKey: route.meta.parentKey,
          openKeys: ancestorKeys,
          matchedPathLength: len,
        };
      }
      return;
    }

    const matchLen = getRouteMatchLength(route, pathname, parentPath);
    if (matchLen > bestMatch.matchedPathLength) {
      // For index menu items, selected key is parent path
      const selectedKey =
        route.index && shouldShowInMenu(route) && parentPath ? parentPath : key;
      bestMatch = {
        selectedKey,
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
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const menuItems = useMemo(() => {
    return buildMenuItems(
      layoutRoute.children ?? EMPTY_ROUTES,
      'root',
      undefined,
      collapsed,
    );
  }, [collapsed]);

  const activeMenuState = useMemo(() => {
    return findActiveMenuState(
      layoutRoute.children ?? EMPTY_ROUTES,
      pathname,
      'root',
    );
  }, [pathname]);

  const [openKeys, setOpenKeys] = useState<string[]>(activeMenuState.openKeys);

  useEffect(() => {
    if (!collapsed) {
      setOpenKeys((prev) => {
        const merged = new Set([...prev, ...activeMenuState.openKeys]);
        return Array.from(merged);
      });
    }
  }, [activeMenuState.openKeys, collapsed]);

  return (
    <AntMenu
      mode="inline"
      inlineCollapsed={collapsed}
      inlineIndent={12}
      selectable
      selectedKeys={activeMenuState.selectedKey ? [activeMenuState.selectedKey] : []}
      openKeys={collapsed ? [] : openKeys}
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
      items={menuItems}
      tabIndex={0}
    />
  );
};

export default Menu;
