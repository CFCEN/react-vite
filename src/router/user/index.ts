import { LoginOutlined } from '@ant-design/icons'
import Login from '@/pages/login'
import type { Route } from '@/router/types'
import { createElement } from 'react'

const routes: Route = {
  key: 2,
  path: '/login',
  Component: Login,
  name: '登录',
  icon: createElement(LoginOutlined),
}

export default routes
