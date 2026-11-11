import perfRulesJson from '@/fixtures/raw/perf-rules.json'
import { num, shortDept, sum } from './format'
import type { PerfRecord } from './types'

export interface PerfSummary {
  name: string
  dept: string
  cnt: number
  months: Record<string, number>
  attr: Record<string, number>
  monthCount: number
  add: number
  sub: number
  total: number
  grade: string
}

export interface PerfRule {
  item: string
  color: string
  rows: string[]
}

export const PERF_RULES = perfRulesJson as PerfRule[]

export const PERF_ATTRS = ['准确率', '准时率', '纪律', '团队协作', '技能'] as const

export function perfGrade(total: number): string {
  return total >= 105 ? 'A' : total >= 100 ? 'B' : total >= 95 ? 'C' : 'D'
}

export function computePerf(list: PerfRecord[]): PerfSummary[] {
  const m: Record<string, PerfSummary> = {}
  list.forEach((p) => {
    const names = String(p.who || '')
      .split(/[/、]/)
      .map((s) => s.trim())
      .filter((s) => /^[\u4e00-\u9fa5]{2,3}$/.test(s))
    if (!names.length) return
    const share = num(p.score) / names.length
    let mon = String(p.date || '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(mon)) mon = '历史'
    names.forEach((n) => {
      const s =
        m[n] ||
        (m[n] = {
          name: n,
          dept: shortDept(p.dept) || '注塑',
          cnt: 0,
          months: {},
          attr: {},
          monthCount: 0,
          add: 0,
          sub: 0,
          total: 100,
          grade: 'B',
        })
      s.cnt++
      s.months[mon] = (s.months[mon] || 0) + share
      s.attr[p.attr] = (s.attr[p.attr] || 0) + share
    })
  })
  return Object.values(m)
    .map((s) => {
      const ms = Object.values(s.months)
      const n = ms.length || 1
      const net = ms.reduce((a, b) => a + b, 0) / n
      const addAvg = ms.filter((v) => v > 0).reduce((a, b) => a + b, 0) / n
      const subAvg = ms.filter((v) => v < 0).reduce((a, b) => a + b, 0) / n
      s.monthCount = ms.length
      s.add = +addAvg.toFixed(1)
      s.sub = +(-subAvg).toFixed(1)
      s.total = +(100 + net).toFixed(1)
      s.grade = perfGrade(s.total)
      return s
    })
    .sort((a, b) => b.total - a.total)
}

export function perfGradeCounts(list: PerfSummary[]): Record<string, number> {
  const out: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  list.forEach((p) => {
    out[p.grade] = (out[p.grade] || 0) + 1
  })
  return out
}

export interface PerfAttrItem {
  label: string
  value: number
  color: string
  text: string
}

const ADD_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b', '#64748b']
const SUB_COLORS = ['#dc2626', '#f97316', '#db2777', '#ef4444', '#94a3b8']

export function perfAttrStats(
  list: PerfRecord[]
): { add: PerfAttrItem[]; sub: PerfAttrItem[] } {
  const attr: Record<string, { add: number; sub: number }> = {}
  list.forEach((p) => {
    const a = p.attr || '其他'
    const o = attr[a] || (attr[a] = { add: 0, sub: 0 })
    const v = num(p.score)
    if (v >= 0) o.add += v
    else o.sub += -v
  })
  const entries = Object.entries(attr)
  return {
    add: entries.map(([k, v], i) => ({
      label: k,
      value: v.add,
      color: ADD_COLORS[i % ADD_COLORS.length],
      text: `+${v.add.toFixed(1)}`,
    })),
    sub: entries.map(([k, v], i) => ({
      label: k,
      value: v.sub,
      color: SUB_COLORS[i % SUB_COLORS.length],
      text: `-${v.sub.toFixed(1)}`,
    })),
  }
}

export function perfAverage(list: PerfSummary[]): number | null {
  return list.length ? +(sum(list, (x) => x.total) / list.length).toFixed(1) : null
}
