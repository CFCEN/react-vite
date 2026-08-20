import { Suspense, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Drawer,
  Grid,
  Layout as AntLayout,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import Menu from '@/layout/menu';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { StatusDot } from '@/components/StatusTag';
import { useUIStore } from '@/stores/uiStore';
import { useTheme } from '@/hooks/useTheme';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { layoutRoute } from '@/router/routes';
import type { Route } from '@/router/types';
import { buildBreadcrumbs, findMatchedRoute } from '@/utils/routeMeta';
import { layout as layoutTokens } from '@/theme';
import './index.less';

const { Sider, Content, Header } = AntLayout;
const { useBreakpoint } = Grid;

/** Stable empty fallback — avoids `?? []` creating a new array identity each render. */
const EMPTY_ROUTES: Route[] = [];

const Layout: React.FC = () => {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { theme, toggleTheme, isDark } = useTheme();
  const { status: healthStatus, online, refresh: refreshHealth } = useBackendHealth();
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  // Auto-collapse on narrow screens
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile, setSidebarCollapsed]);

  const breadcrumbs = useMemo(
    () =>
      buildBreadcrumbs(layoutRoute.children ?? EMPTY_ROUTES, location.pathname),
    [location.pathname],
  );

  const matched = useMemo(
    () =>
      findMatchedRoute(layoutRoute.children ?? EMPTY_ROUTES, location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    const title =
      matched?.meta?.title ||
      matched?.name ||
      (location.pathname !== '/' ? 'Not Found' : 'Local Dev Workspace');
    document.title = `${title} · LDW`;
  }, [matched, location.pathname]);

  const siderContent = (
    <div className="ldw-sider-inner">
      <div
        className="ldw-logo"
        role="button"
        tabIndex={0}
        onClick={() => navigate('/dashboard')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate('/dashboard');
        }}
      >
        <span className="ldw-logo-mark" aria-hidden>
          LD
        </span>
        {!collapsed && (
          <Typography.Text className="ldw-logo-text" ellipsis>
            Local Dev Workspace
          </Typography.Text>
        )}
      </div>
      <Menu />
      <div className="ldw-sider-footer">
        <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
          <Button
            type="text"
            className="ldw-collapse-btn ldw-clickable"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            block
          />
        </Tooltip>
      </div>
    </div>
  );

  return (
    <AntLayout className="ldw-layout">
      {!isMobile && (
        <Sider
          className="ldw-sider"
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={layoutTokens.siderWidth}
          collapsedWidth={layoutTokens.siderCollapsedWidth}
          theme={isDark ? 'dark' : 'light'}
        >
          {siderContent}
        </Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          open={!collapsed}
          onClose={() => setSidebarCollapsed(true)}
          width={layoutTokens.siderWidth}
          styles={{ body: { padding: 0 } }}
          className="ldw-mobile-drawer"
        >
          <div className="ldw-sider-inner ldw-sider-inner--drawer">{siderContent}</div>
        </Drawer>
      )}

      <AntLayout className="ldw-main">
        <Header className="ldw-header">
          <div className="ldw-header-left">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setSidebarCollapsed(false)}
                className="ldw-clickable"
                aria-label="Open menu"
              />
            )}
            <Breadcrumb
              className="ldw-breadcrumb"
              items={breadcrumbs.map((item, idx) => ({
                title:
                  item.path && idx < breadcrumbs.length - 1 ? (
                    <Link to={item.path}>{item.title}</Link>
                  ) : (
                    item.title
                  ),
              }))}
            />
          </div>
          <Space size={4} className="ldw-header-actions">
            <Tooltip
              title={
                online
                  ? 'Backend online (127.0.0.1:9527)'
                  : healthStatus === 'checking'
                    ? 'Checking backend…'
                    : 'Backend offline'
              }
            >
              <button
                type="button"
                className="ldw-health-btn ldw-clickable"
                onClick={refreshHealth}
                aria-label="Backend health"
              >
                <StatusDot
                  status={
                    healthStatus === 'online'
                      ? 'online'
                      : healthStatus === 'checking'
                        ? 'checking'
                        : 'offline'
                  }
                  label={online ? 'Online' : healthStatus === 'checking' ? '…' : 'Offline'}
                  pulse={healthStatus === 'checking' || online}
                />
              </button>
            </Tooltip>
            <Tooltip title="Refresh page data">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
                className="ldw-clickable"
                aria-label="Refresh"
              />
            </Tooltip>
            <Tooltip title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
              <Button
                type="text"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                className="ldw-clickable"
                aria-label="Toggle theme"
              />
            </Tooltip>
          </Space>
        </Header>

        <Content className="ldw-content">
          <div className="ldw-content-inner">
            <Suspense fallback={<LoadingSkeleton variant="detail" />}>
              <Outlet />
            </Suspense>
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
