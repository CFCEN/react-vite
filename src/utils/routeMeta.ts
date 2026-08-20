import type { Route } from '@/router/types';

export interface BreadcrumbItem {
  title: string;
  path?: string;
}

/**
 * Build breadcrumb items from route tree + current pathname.
 * Supports param routes (:id) — uses meta.breadcrumb or name.
 */
export function buildBreadcrumbs(
  routes: Route[],
  pathname: string,
  overrides?: Record<string, string>,
): BreadcrumbItem[] {
  const matched: BreadcrumbItem[] = [];

  const walk = (list: Route[], ancestors: BreadcrumbItem[]): boolean => {
    const sorted = [...list].sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0));

    for (const route of sorted) {
      if (route.meta?.hideInBreadcrumb) continue;

      const title =
        overrides?.[route.path || ''] ||
        route.meta?.breadcrumb ||
        route.meta?.title ||
        route.name;

      if (route.children?.length) {
        const self: BreadcrumbItem = {
          title,
          path: route.path,
        };
        if (walk(route.children, [...ancestors, self])) {
          return true;
        }
        // Parent path exact match (e.g. /applications)
        if (route.path && matchPathPattern(route.path, pathname) && pathname === route.path) {
          matched.push(...ancestors, self);
          return true;
        }
        continue;
      }

      if (route.index) {
        const parentPath = ancestors[ancestors.length - 1]?.path;
        if (parentPath && pathname === parentPath) {
          if (!route.meta?.hideInBreadcrumb && route.showInMenu !== false) {
            matched.push(...ancestors, { title });
          } else {
            matched.push(...ancestors);
          }
          return true;
        }
        continue;
      }

      if (route.path && matchPathPattern(route.path, pathname)) {
        matched.push(...ancestors, {
          title: overrides?.[route.path] || title,
          path: hasParams(route.path) ? undefined : route.path,
        });
        return true;
      }
    }
    return false;
  };

  walk(routes, []);
  return matched;
}

function hasParams(path: string): boolean {
  return path.includes(':');
}

/** Simple :param matcher */
export function matchPathPattern(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
}

/**
 * Find the best matching route for pathname (longest path win).
 */
export function findMatchedRoute(
  routes: Route[],
  pathname: string,
): Route | undefined {
  let best: Route | undefined;
  let bestLen = -1;

  const walk = (list: Route[]) => {
    for (const route of list) {
      if (route.children?.length) {
        walk(route.children);
      }
      if (route.path && matchPathPattern(route.path, pathname)) {
        if (route.path.length > bestLen) {
          best = route;
          bestLen = route.path.length;
        }
      }
      if (route.index) {
        // handled via parent
      }
    }
  };

  walk(routes);
  return best;
}
