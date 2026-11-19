// 菜单数据 + active 判定 + 可见性过滤。复制到 src/layouts/default-layout/menu.ts
//
// Element UI 2 的图标是字体类名（'el-icon-s-grid'），不是组件，
// 所以 icon 字段直接存类名，模板里 <i :class="item.icon" />。

export interface NavItem {
  /** 唯一标识，用于 active 判定与权限白名单 */
  key: string
  label: string
  /** el-icon-* 类名 */
  icon: string
  route: string
  /**
   * 详情页等子路径也要高亮时置 true。
   * 不一律前缀匹配，是因为 /knowledge 与 /knowledge/rsr 会互相抢高亮。
   */
  prefix?: boolean
  /** 数字角标，0 或 undefined 不显示 */
  badge?: number
}

export interface NavGroup {
  title: string
  dot: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: '我的工作台',
    dot: '#4e8af4',
    items: [
      { key: 'todos', label: '我的待办', icon: 'el-icon-tickets', route: '/todos' },
      { key: 'board', label: '任务看板', icon: 'el-icon-s-grid', route: '/board' },
      { key: 'notifications', label: '通知中心', icon: 'el-icon-bell', route: '/notifications' },
    ],
  },
  {
    title: '全局视图',
    dot: '#7e8b9c',
    items: [
      { key: 'projects', label: '项目总览', icon: 'el-icon-folder', route: '/projects' },
      { key: 'statistics', label: '统计看板', icon: 'el-icon-data-line', route: '/statistics' },
    ],
  },
  {
    title: '系统管理',
    dot: '#5c6b7a',
    items: [
      { key: 'admin-users', label: '用户管理', icon: 'el-icon-user', route: '/admin/users' },
      { key: 'admin-roles', label: '角色管理', icon: 'el-icon-avatar', route: '/admin/roles' },
      { key: 'admin-settings', label: '系统配置', icon: 'el-icon-setting', route: '/admin/settings' },
    ],
  },
]

/**
 * 当前路径是否命中某个菜单项。
 * prefix 项用 `${route}/` 边界判子路径；其余项精确匹配。
 */
export function isMenuItemActive(item: NavItem, path: string): boolean {
  if (!item.prefix) return path === item.route
  // indexOf 而非 startsWith：IE11 下少一次 polyfill 依赖
  return path === item.route || path.indexOf(`${item.route}/`) === 0
}

/** 按 key 白名单过滤菜单，并丢掉过滤后为空的分组 */
export function filterMenuGroups(groups: NavGroup[], allowed?: string[]): NavGroup[] {
  if (!allowed) return groups
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.indexOf(item.key) >= 0) }))
    .filter((group) => group.items.length > 0)
}
