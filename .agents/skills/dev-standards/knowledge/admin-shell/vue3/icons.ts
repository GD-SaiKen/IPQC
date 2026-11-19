// 菜单图标映射。复制到 src/layouts/default-layout/icons.ts
//
// 为什么是一张显式表而不是全量注册：
//   app.component(k, v) 循环注册会把 200+ 图标全部打进首屏包；
//   后台管理端用到的图标总量有限，列出来更划算，也便于统一换图标。
//
// 新增菜单项时，在 NAV_GROUPS 里写图标名，再到这里加一行导入 —— 忘了加会退回兜底图标，
// 不会渲染成未知元素（那会刷一堆 Vue 警告）。

import {
  Avatar,
  Bell,
  DataLine,
  Document,
  Folder,
  Grid,
  List,
  Setting,
  TrendCharts,
  User,
  UserFilled,
} from '@element-plus/icons-vue'

const ICONS = {
  Avatar,
  Bell,
  DataLine,
  Document,
  Folder,
  Grid,
  List,
  Setting,
  TrendCharts,
  User,
  UserFilled,
} as const

export type IconName = keyof typeof ICONS

export function resolveIcon(name: string) {
  return ICONS[name as IconName] ?? Document
}
