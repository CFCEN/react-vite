import { Card, Typography, Space } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';

const { Text, Paragraph } = Typography;

const Settings = () => {
  return (
    <PageContainer title="Settings">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="Backend" extra={<SettingOutlined />}>
          <Paragraph>
            <Text strong>API Base URL: </Text>
            <code>http://127.0.0.1:9527</code>
          </Paragraph>
          <Paragraph type="secondary">
            后端服务地址。当前版本仅支持本地连接（127.0.0.1 / localhost）。
          </Paragraph>
        </Card>

        <Card title="About">
          <Paragraph>
            <Text strong>Local Dev Workspace</Text>
          </Paragraph>
          <Paragraph type="secondary">
            运行在 macOS 本机上的开发环境控制中心。
            管理配置文件、日志、本地应用进程、Git 项目和工作空间。
          </Paragraph>
          <Paragraph type="secondary">
            Version: 1.0.0-dev | Tech: React + TypeScript + Vite + Go + SQLite
          </Paragraph>
        </Card>
      </Space>
    </PageContainer>
  );
};

export default Settings;
