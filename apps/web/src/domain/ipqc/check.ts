import checkItemsJson from '@/fixtures/raw/check-items.json'
import realJson from '@/fixtures/raw/real.json'
import type { CheckScores } from './types'
import { pct, sum } from './format'

export const CHK_FULL = 140
export const CHK_TARGET = 100
export const CHK_APPLY: Record<string, { before: number; from10: number }> = {
  注塑毛边: { before: 40, from10: 60 },
}

export type CheckItemTuple = [category: string, item: string, score: number]
export const CHECK_ITEMS = checkItemsJson as unknown as Record<string, CheckItemTuple[]>

const REAL_CHECK = realJson as {
  checkItemScores?: Record<string, (number | null)[]>
  checkDaily?: Record<string, { m: number; s: number }[]>
}
/** 仅注塑车间有逐项实测清单；其余责任区只有总分 */
export const CHECK_ITEM_SCORES = REAL_CHECK.checkItemScores || {}
export const CHECK_DAILY = REAL_CHECK.checkDaily || {}

export function chkLatest(scores: CheckScores, w: string): number {
  const s = scores[w] || {}
  const ks = Object.keys(s).map(Number).sort((a, b) => a - b)
  return ks.length ? Number(s[ks[ks.length - 1]]) : 0
}

export function chkLatestMonth(scores: CheckScores, w: string): number {
  const s = scores[w] || {}
  const ks = Object.keys(s)
    .map(Number)
    .filter((k) => Number.isFinite(s[k]))
    .sort((a, b) => a - b)
  return ks.length ? ks[ks.length - 1] : 10
}

export function chkMax(scores: CheckScores, w: string, m?: number): number {
  const ap = CHK_APPLY[w]
  if (!ap) return CHK_FULL
  const mm = m == null ? chkLatestMonth(scores, w) : m
  return mm >= 10 ? ap.from10 : ap.before
}

export function chkScaleText(w: string): string {
  const ap = CHK_APPLY[w]
  return ap
    ? `适用项分值 1–9 月 ${ap.before} 分 / 10 月起 ${ap.from10} 分（全表满分 ${CHK_FULL} 分）`
    : `全表满分 ${CHK_FULL} 分，含加分项可超 100`
}

export function chkMonthScore(
  scores: CheckScores,
  w: string,
  m: number
): number | null {
  const cs = scores[w] || {}
  if (m) return cs[m] == null ? null : +cs[m]
  const vs = Object.values(cs).map(Number).filter((v) => Number.isFinite(v))
  return vs.length ? +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null
}

export function chkRate(scores: CheckScores, w: string): number {
  return Math.min(100, pct(chkLatest(scores, w), CHK_TARGET))
}

export interface ChkRankRow {
  key: string
  latest: number
  rate: number
  max: number
  trend: number[]
}

export function chkRank(scores: CheckScores, keys: string[]): ChkRankRow[] {
  return keys
    .map((key) => {
      const raw = scores[key] || {}
      const max = chkMax(scores, key)
      return {
        key,
        latest: +chkLatest(scores, key).toFixed(1),
        rate: chkRate(scores, key),
        max,
        trend: Object.keys(raw)
          .map(Number)
          .sort((a, b) => a - b)
          .map((m) =>
            +((Number(raw[m]) / (chkMax(scores, key, m) || 100)) * 100).toFixed(1)
          ),
      }
    })
    .sort((a, b) => b.latest - a.latest)
}

export function chkTrend(scores: CheckScores, w: string): (number | null)[] {
  const raw = scores[w] || {}
  return Array.from({ length: 10 }, (_, i) => {
    const v = raw[i + 1]
    return v == null ? null : Number(v)
  })
}

export interface ChkItemRow {
  category: string
  item: string
  score: number
  last: number | null
  rate: number | null
}

export function chkItemRows(w: string, itemScores: (number | null)[] | null): ChkItemRow[] {
  return (CHECK_ITEMS[w] || []).map(([category, item, score], i) => {
    const last = itemScores && itemScores[i] != null ? itemScores[i] : null
    return {
      category,
      item,
      score,
      last,
      rate: last == null ? null : Math.max(0, Math.min(100, (last / score) * 100)),
    }
  })
}

export function chkItemTotal(w: string): number {
  return sum(CHECK_ITEMS[w] || [], (x) => x[2])
}

export interface ChkDailyCell {
  m: number
  s: number
  ratio: number
}

export function chkDailyCells(
  scores: CheckScores,
  daily: { m: number; s: number }[],
  w: string
): ChkDailyCell[] {
  return daily.slice(-30).map((d) => {
    const max = chkMax(scores, w, d.m)
    return { m: d.m, s: d.s, ratio: Math.max(0, Math.min(1, d.s / max)) }
  })
}

export interface ChkStats {
  zones: number
  max: ChkRankRow | null
  min: ChkRankRow | null
  passRate: number
  avg: number | null
  avgEx: number | null
}

export function chkStats(scores: CheckScores, keys: string[]): ChkStats {
  const rank = chkRank(scores, keys)
  const vals = rank.map((r) => r.latest).filter((v) => Number.isFinite(v))
  const ex = rank.filter((r) => !CHK_APPLY[r.key]).map((r) => r.latest)
  return {
    zones: keys.length,
    max: rank[0] || null,
    min: rank.length ? rank[rank.length - 1] : null,
    passRate: pct(rank.filter((r) => r.latest >= CHK_TARGET).length, rank.length),
    avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null,
    avgEx: ex.length ? +(ex.reduce((a, b) => a + b, 0) / ex.length).toFixed(1) : null,
  }
}
