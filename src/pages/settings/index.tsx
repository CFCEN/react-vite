import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Descriptions,
  Segmented,
  Space,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  ClearOutlined,
  DesktopOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { API_BASE_URL } from '@/api/client';
import { workspaceApi } from '@/api/workspaceApi';
import { useBackendHealth, useTheme } from '@/hooks';
import { useUIStore } from '@/stores/uiStore';
import {
  PageContainer,
  StatusDot,
  PathText,
  CopyableText,
  ConfirmButton,
  TimeText,
} from '@/components';
import './index.less';

const { Text, Paragraph } = Typography;

const APP_VERSION = '0.0.0';
const APP_NAME = 'Local Dev Workspace';

const Settings = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const tableDensity = useUIStore((s) => s.tableDensity);
  const setTableDensity = useUIStore((s) => s.setTableDensity);
  const health = useBackendHealth();
  const [clearing, setClearing] = useState(false);

  const workspaceQuery = useQuery({
    queryKey: ['workspace'],
    queryFn: () => workspaceApi.overview(),
  });

  const root = workspaceQuery.data?.data?.root;

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const preservedTheme = useUIStore.getState().theme;
      const preservedDensity = useUIStore.getState().tableDensity;
      const preservedEditor = useUIStore.getState().editorTheme;
      const preservedCollapsed = useUIStore.getState().sidebarCollapsed;

      queryClient.clear();
      localStorage.clear();

      // Re-apply UI preferences so theme/density keep working after wipe
      useUIStore.setState({
        theme: preservedTheme,
        tableDensity: preservedDensity,
        editorTheme: preservedEditor,
        sidebarCollapsed: preservedCollapsed,
      });
      useUIStore.getState().setTheme(preservedTheme);

      message.success('Query cache and localStorage cleared');
    } finally {
      setClearing(false);
    }
  };

  return (
    <PageContainer
      title="Settings"
      subTitle="Diagnostics and local preferences"
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            health.refresh();
            void workspaceQuery.refetch();
          }}
          loading={health.isFetching || workspaceQuery.isFetching}
          aria-label="Refresh diagnostics"
        >
          Refresh
        </Button>
      }
    >
      <Space direction="vertical" size="middle" className="settings-page">
        <Card
          title={
            <Space>
              <ApiOutlined aria-hidden />
              <span>Backend</span>
            </Space>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Status">
              <StatusDot
                status={health.status}
                label={
                  health.status === 'online'
                    ? 'Online'
                    : health.status === 'offline'
                      ? 'Offline'
                      : 'Checking'
                }
                pulse={health.status === 'online'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Last checked">
              {health.lastCheckedAt ? (
                <TimeText value={new Date(health.lastCheckedAt)} />
              ) : (
                <Text type="secondary">—</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="API Base URL" span={2}>
              <CopyableText text={API_BASE_URL} mono />
            </Descriptions.Item>
            <Descriptions.Item label="Workspace root" span={2}>
              {workspaceQuery.isLoading ? (
                <Text type="secondary">Loading…</Text>
              ) : root ? (
                <PathText path={root} />
              ) : (
                <Text type="secondary">Unavailable</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
          {health.error ? (
            <Paragraph type="danger" className="settings-hint">
              {health.error.message}
            </Paragraph>
          ) : null}
          <Paragraph type="secondary" className="settings-hint">
            Health is probed via GET /api/workspace. There is no dedicated settings API yet.
          </Paragraph>
        </Card>

        <Card
          title={
            <Space>
              <DesktopOutlined aria-hidden />
              <span>Appearance</span>
            </Space>
          }
        >
          <div className="settings-row">
            <div>
              <Text strong>Theme</Text>
              <Paragraph type="secondary" className="settings-hint">
                Persisted in localStorage (ldw-ui). Applies immediately.
              </Paragraph>
            </div>
            <Segmented
              value={theme}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              onChange={(v) => setTheme(v as 'light' | 'dark')}
              aria-label="Theme"
            />
          </div>
          <div className="settings-row">
            <div>
              <Text strong>Table density</Text>
              <Paragraph type="secondary" className="settings-hint">
                Default density for DataTable across the app.
              </Paragraph>
            </div>
            <Segmented
              value={tableDensity}
              options={[
                { label: 'Default', value: 'default' },
                { label: 'Middle', value: 'middle' },
                { label: 'Small', value: 'small' },
              ]}
              onChange={(v) =>
                setTableDensity(v as 'default' | 'middle' | 'small')
              }
              aria-label="Table density"
            />
          </div>
        </Card>

        <Card
          title={
            <Space>
              <ClearOutlined aria-hidden />
              <span>Cache</span>
            </Space>
          }
        >
          <Paragraph type="secondary" className="settings-hint">
            Clears TanStack Query cache and localStorage, then restores theme / density preferences.
          </Paragraph>
          <ConfirmButton
            danger
            icon={<ClearOutlined />}
            confirmTitle="Clear local cache?"
            confirmDescription="Query cache and localStorage will be wiped. Theme and density are restored afterward."
            loading={clearing}
            onConfirm={handleClearCache}
            aria-label="Clear cache"
          >
            Clear cache
          </ConfirmButton>
        </Card>

        <Card
          title={
            <Space>
              <InfoCircleOutlined aria-hidden />
              <span>About</span>
            </Space>
          }
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label="App">{APP_NAME}</Descriptions.Item>
            <Descriptions.Item label="Version">
              <CopyableText text={APP_VERSION} mono />
            </Descriptions.Item>
            <Descriptions.Item label="Mode">{import.meta.env.MODE}</Descriptions.Item>
            <Descriptions.Item label="Dev">{import.meta.env.DEV ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Stack">
              React + TypeScript + Vite + Ant Design + Go + SQLite
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </PageContainer>
  );
};

export default Settings;
