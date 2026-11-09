import type { WorkshopConfig } from './types'

/** 与原型 / 规格一致；提取脚本亦会写入 fixtures/raw/workshops.json 供对照 */
export const WORKSHOPS: WorkshopConfig[] = [
  { key: '注塑', name: '注塑车间', owner: '杨永昌', ce: '何少平', color: '#2563eb', max: 140 },
  { key: '注塑毛边', name: '注塑毛边车间', owner: '毛瑞', ce: '何少平', color: '#0891b2', max: 40 },
  { key: '压铸', name: '压铸车间', owner: '李嗣顺', ce: '陈财善', color: '#7c3aed', max: 140 },
  { key: '五金', name: '五金车间', owner: '杨高峰', ce: '覃宇翔', color: '#0d9488', max: 140 },
  { key: '涂装', name: '涂装车间', owner: '潘光明', ce: '陈君', color: '#f59e0b', max: 140 },
  { key: '印刷', name: '印刷车间', owner: '赵春萍', ce: '陈君', color: '#db2777', max: 140 },
]

export const WS_MAP = Object.fromEntries(WORKSHOPS.map((w) => [w.key, w])) as Record<
  string,
  WorkshopConfig
>

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export function mLabel(m: number): string {
  return m ? `${m} 月` : '2026 年 1–10 月累计'
}
