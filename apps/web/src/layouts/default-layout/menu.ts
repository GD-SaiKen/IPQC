import type { WorkshopFilter, WorkshopKey } from '@/domain/ipqc/types'
import { WORKSHOPS } from '@/domain/ipqc/workshops'

export interface NavItem {
  key: string
  label: string
  icon: string
  route?: string
  routeName?: string
  /** 进入车间子工作台（非路由直链） */
  workshopEnter?: WorkshopKey
  badge?: number
}

export interface NavGroup {
  title: string
  dot: string
  items: NavItem[]
}

const SUB_WORKSHOP_ITEMS: Omit<NavItem, 'badge'>[] = [
  { key: 'dash', label: '车间总览', icon: 'DataLine', routeName: 'dash' },
  { key: 'fa', label: '首件巡检检验', icon: 'Operation', routeName: 'fa' },
  { key: 'fqc', label: '终检报告 FQC', icon: 'Document', routeName: 'fqc' },
  { key: 'cmp', label: '零件投诉闭环', icon: 'Memo', routeName: 'cmp' },
  { key: 'chk', label: '关键点检排名', icon: 'TrendCharts', routeName: 'chk' },
  { key: 'trn', label: '培训与技能', icon: 'Notebook', routeName: 'trn' },
  { key: 'perf', label: '工作绩效', icon: 'Medal', routeName: 'perf' },
]

export function isMenuItemActive(
  item: NavItem,
  path: string,
  name?: string | null
): boolean {
  if (item.routeName) return name === item.routeName
  if (item.route) return path === item.route || path.startsWith(`${item.route}/`)
  return false
}

/** 按当前车间上下文生成侧栏分组（菜单数据不进 template） */
export function buildIpqcMenuGroups(
  workshop: WorkshopFilter,
  badges: Record<string, number> = {}
): NavGroup[] {
  const sys: NavGroup = {
    title: '系统',
    dot: '#5c6b7a',
    items: [
      { key: 'data', label: '数据与设置', icon: 'Setting', routeName: 'data', badge: badges.data },
    ],
  }

  if (workshop === '全部') {
    return [
      {
        title: '总看板',
        dot: '#4e8af4',
        items: [
          {
            key: 'board',
            label: '月度目视化',
            icon: 'Grid',
            routeName: 'board',
          },
        ],
      },
      {
        title: '车间子工作台',
        dot: '#0d9488',
        items: WORKSHOPS.map((w) => ({
          key: `ws-${w.key}`,
          label: w.name,
          icon: 'Shop',
          workshopEnter: w.key,
          badge: badges[`ws-${w.key}`],
        })),
      },
      sys,
    ]
  }

  const ws = WORKSHOPS.find((w) => w.key === workshop)
  return [
    {
      title: ws ? `${ws.name}` : '子工作台',
      dot: ws?.color ?? '#4e8af4',
      items: SUB_WORKSHOP_ITEMS.map((item) => ({
        ...item,
        badge: badges[item.key],
      })),
    },
    {
      title: '切换',
      dot: '#7e8b9c',
      items: [
        { key: 'back-board', label: '返回总看板', icon: 'DataAnalysis', routeName: 'board' },
        ...WORKSHOPS.filter((w) => w.key !== workshop).map((w) => ({
          key: `ws-${w.key}`,
          label: w.name,
          icon: 'Shop',
          workshopEnter: w.key,
        })),
      ],
    },
    sys,
  ]
}
