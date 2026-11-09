import type { CheckScores } from './types'
import { pct } from './format'

export const CHK_FULL = 140
export const CHK_TARGET = 100
export const CHK_APPLY: Record<string, { before: number; from10: number }> = {
  注塑毛边: { before: 40, from10: 60 },
}

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
