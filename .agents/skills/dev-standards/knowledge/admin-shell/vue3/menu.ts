// 菜单数据 + active 判定 + 可见性过滤。复制到 src/layouts/default-layout/menu.ts
//
// 菜单是「白名单」，不是路由表的镜像：有路由但不出现在菜单里的页面（详情、编辑）
// 属于正常情况，它们靠 meta.parent 从上一级进入。

export interface NavItem {
  /** 唯一标识，用于 active 判定与权限白名单 */
  key: string
  label: string
  /** 图标名，在 icons.ts 里映射成组件 */
  icon: string
  /** 目标路径 */
  route: string
  /** 有动态参数时用 name 跳转，优先于 route */
  routeName?: string
  /** 数字角标，0 或 undefined 不显示。不要写死数字，从数据源取 */
  badge?: number
}

export interface NavGroup {
  /** 分组标题 */
  title: string
  /** 分组标题前小圆点的色值 */
  dot: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: '我的工作台',
    dot: '#4e8af4',
    items: [
      { key: 'todos', label: '我的待办', icon: 'List', route: '/todos' },
      { key: 'board', label: '任务看板', icon: 'Grid', route: '/board' },
      { key: 'notifications', label: '通知中心', icon: 'Bell', route: '/notifications' },
    ],
  },
  {
    title: '全局视图',
    dot: '#7e8b9c',
    items: [
      { key: 'projects', label: '项目总览', icon: 'Folder', route: '/projects' },
      { key: 'statistics', label: '统计看板', icon: 'TrendCharts', route: '/statistics' },
    ],
  },
  {
    title: '系统管理',
    dot: '#5c6b7a',
    items: [
      { key: 'admin-users', label: '用户管理', icon: 'User', route: '/admin/users' },
      { key: 'admin-roles', label: '角色管理', icon: 'Avatar', route: '/admin/roles' },
      { key: 'admin-settings', label: '系统配置', icon: 'Setting', route: '/admin/settings' },
    ],
  },
]

/**
 * 当前路由是否命中某个菜单项。
 *
 * - routeName 优先：有动态参数时按路由名比，比拼路径稳
 * - route + '/' 边界：只做 startsWith(route) 会让 /admin/users-v2 命中 /admin/users
 */
export function isMenuItemActive(item: NavItem, path: string, name?: string | null): boolean {
  if (item.routeName) return name === item.routeName
  return path === item.route || path.startsWith(`${item.route}/`)
}

/**
 * 按 key 白名单过滤菜单，并丢掉过滤后为空的分组。
 * 传 undefined 表示不过滤（未接入权限体系时）。
 */
export function filterMenuGroups(groups: NavGroup[], allowed?: string[]): NavGroup[] {
  if (!allowed) return groups
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.includes(item.key)) }))
    .filter((group) => group.items.length > 0)
}
