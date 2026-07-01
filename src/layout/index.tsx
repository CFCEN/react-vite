import { Outlet } from 'react-router';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Layout as AntLayout, theme } from 'antd';
import { useState } from 'react';
import Menu from '@/layout/menu';
import './index.less';
import CustomIcon from '@/components/CustomIcom';

const { Sider, Content } = AntLayout;

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <AntLayout
      style={{ minHeight: '100vh', minWidth: '100vw', margin: 0, padding: 0 }}
    >
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={50}
        style={{
          background: '#fff',
          height: '100vh',
        }}
      >
        <Button
          type="text"
          className="menu-toggle-button"
          icon={
            <CustomIcon
              iconName="menu"
              type="svg"
              iconWidth={20}
              iconHeight={20}
            />
          }
          onClick={() => setCollapsed(!collapsed)}
        />
        <Menu />
      </Sider>
      <AntLayout>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            height: 'calc(100vh - 100px)',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
