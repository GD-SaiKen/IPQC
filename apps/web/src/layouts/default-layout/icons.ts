import {
  Box,
  Brush,
  Coin,
  DataAnalysis,
  DataLine,
  Document,
  Grid,
  Medal,
  Memo,
  Notebook,
  Operation,
  Printer,
  Scissor,
  Setting,
  Shop,
  Tools,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'

const ICONS = {
  Box,
  Brush,
  Coin,
  DataAnalysis,
  DataLine,
  Document,
  Grid,
  Medal,
  Memo,
  Notebook,
  Operation,
  Printer,
  Scissor,
  Setting,
  Shop,
  Tools,
  TrendCharts,
  User,
} as const

export type IconName = keyof typeof ICONS

export function resolveIcon(name: string) {
  return ICONS[name as IconName] ?? Document
}
