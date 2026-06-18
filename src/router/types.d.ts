import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'

type Route = Omit<RouteObject, 'children'> & {
  name: string
  icon?: ReactNode
  children?: Route[]
  key?: number
  showInMenu?: boolean // 是否显示在菜单中；未配置时默认显示，只有显式传 false 才隐藏
}
