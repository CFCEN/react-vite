/**
 * 菜单项
 * key: '1',
          icon: <UserOutlined />,
          label: 'nav 1',
          onClick: () => {
            navigate('/home')
          },
          children: [
            {
              key: '1-1',
              icon: <HomeOutlined />,
              label: 'Home',
              path: '/home',
            },
          ],
 */
interface MenuItem {
  key: string
  icon: React.ReactNode
  label: string
  path?: string
  onClick?: () => void
  children?: MenuItem[]
}

interface MenuProps {
  items: MenuItem[]
}
