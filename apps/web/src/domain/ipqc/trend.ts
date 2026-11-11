import { allKpi, wsKpi } from './kpi'
import { cmpMonthlyTrend } from './cmp'
import { chkMonthScore } from './check'
import { fqcMonthStats } from './fqc'
import { inMonth, pct } from './format'
import { MONTHS, WORKSHOPS } from './workshops'
import type { CheckScores, FqcNgRow, IpqcDb, WorkshopFilter, WorkshopKey } from './types'

export interface BoardMetric {
  k: string
  name: string
  unit: string
  aim: 'high' | 'low'
  target?: number
  allKey?: string
}

export const BOARD_METRICS: BoardMetric[] = [
  { k: 'cmpN', name: '投诉批次', unit: ' 批', aim: 'low' },
  { k: 'cmpClose', name: '投诉结案率', unit: '%', aim: 'high', target: 95 },
  { k: 'faOK', name: '首件合格率', unit: '%', aim: 'high', target: 95 },
  { k: 'chk', name: '点检得分', unit: ' 分', aim: 'high', target: 100, allKey: 'chkAvg' },
  { k: 'perf', name: '绩效均分', unit: ' 分', aim: 'high', target: 100 },
  { k: 'trnP', name: '培训人次', unit: ' 人次', aim: 'high' },
  { k: 'fqcRate', name: '终检不良率', unit: '%', aim: 'low' },
]

export const HEAT = [
  { min: 0.92, bg: '#cdebd9', fg: '#0b6b3f' },
  { min: 0.8, bg: '#e5f6ec', fg: '#0b7a45' },
  { min: 0.65, bg: '#fdf5df', fg: '#a16207' },
  { min: 0.5, bg: '#fce6d8', fg: '#b45309' },
  { min: -9, bg: '#fbdcd9', fg: '#b91c1c' },
]

export function heatOf(ratio: number | null): { bg: string; fg: string } {
  if (ratio == null || !Number.isFinite(ratio)) return { bg: '#f6f8fb', fg: '#a8b6c7' }
  for (const h of HEAT) if (ratio >= h.min) return h
  return HEAT[HEAT.length - 1]
}

export interface MatrixRow {
  key: WorkshopKey
  name: string
  cells: (number | null)[]
  all: number | null
}

export interface MatrixData {
  metric: BoardMetric
  months: readonly number[]
  rows: MatrixRow[]
  total: { cells: (number | null)[]; all: number | null }
}

function pick(o: Record<string, unknown>, k: string): number | null {
  const v = o[k]
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v)
}

export function boardMatrix(
  db: IpqcDb,
  checkScores: CheckScores,
  metricKey: string
): MatrixData {
  const metric = BOARD_METRICS.find((x) => x.k === metricKey) || BOARD_METRICS[0]
  const allKey = metric.allKey || metric.k
  const rows = WORKSHOPS.map((w) => ({
    key: w.key,
    name: w.name,
    cells: MONTHS.map((m) => pick(wsKpi(db, checkScores, w.key, m) as unknown as Record<string, unknown>, metric.k)),
    all: pick(wsKpi(db, checkScores, w.key, 0) as unknown as Record<string, unknown>, metric.k),
  }))
  const total = {
    cells: MONTHS.map((m) => pick(allKpi(db, checkScores, m) as unknown as Record<string, unknown>, allKey)),
    all: pick(allKpi(db, checkScores, 0) as unknown as Record<string, unknown>, allKey),
  }
  return { metric, months: MONTHS, rows, total }
}

/** 色阶分母：同一指标全部车间、全部月份里相对比较 */
export function matrixRatio(
  value: number | null,
  metric: BoardMetric,
  allValues: (number | null)[]
): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const v = value
  if (metric.aim === 'low') {
    const mx = Math.max(1, ...allValues.filter((x): x is number => x != null))
    return Math.max(0, 1 - v / mx)
  }
  if (metric.target) return Math.min(1, v / metric.target)
  const mx = Math.max(1, ...allValues.filter((x): x is number => x != null))
  return Math.max(0, v / mx)
}

export interface TrendSeries {
  name: string
  color: string
  data: (number | null)[]
}

export function complaintTrend(
  db: IpqcDb,
  workshop: WorkshopFilter,
  months: readonly number[] = MONTHS
): TrendSeries[] {
  return WORKSHOPS.filter((w) => workshop === '全部' || w.key === workshop).map((w) => ({
    name: w.name,
    color: w.color,
    data: cmpMonthlyTrend(db.cmp, w.key, months),
  }))
}

export function checkTrend(
  checkScores: CheckScores,
  workshop: WorkshopFilter,
  months: readonly number[] = MONTHS
): TrendSeries[] {
  return WORKSHOPS.filter((w) => workshop === '全部' || w.key === workshop).map((w) => ({
    name: w.name,
    color: w.color,
    data: months.map((m) => chkMonthScore(checkScores, w.key, m)),
  }))
}

export interface FqcTrend {
  labels: string[]
  ng: number[]
  rate: number[]
}

export function fqcTrend(
  rows: FqcNgRow[],
  keys: string[],
  months: readonly number[] = MONTHS
): FqcTrend {
  const lotsByMonth = new Map(fqcMonthStats(keys).map((s) => [s.m, s.lots]))
  const ng = months.map((m) => rows.filter((r) => inMonth(r.d, m)).length)
  return {
    labels: months.map((m) => `${m}月`),
    ng,
    rate: months.map((m, i) => {
      const lots = lotsByMonth.get(m) || 0
      return +(lots ? pct(ng[i], lots) : 0).toFixed(2)
    }),
  }
}
