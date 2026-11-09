import {
  DataAnalysis,
  DataLine,
  Document,
  Grid,
  Medal,
  Memo,
  Notebook,
  Operation,
  Setting,
  Shop,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'

const ICONS = {
  DataAnalysis,
  DataLine,
  Document,
  Grid,
  Medal,
  Memo,
  Notebook,
  Operation,
  Setting,
  Shop,
  TrendCharts,
  User,
} as const

export type IconName = keyof typeof ICONS

export function resolveIcon(name: string) {
  return ICONS[name as IconName] ?? Document
}
