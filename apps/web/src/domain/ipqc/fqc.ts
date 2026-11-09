import fqcKeysJson from '@/fixtures/raw/fqc-keys.json'
import fqcsJson from '@/fixtures/raw/fqcs.json'
import { inMonth, num, pct, sum } from './format'
import type { WorkshopFilter } from './types'

export const FQC_KEYS = fqcKeysJson as string[]
export type FqcBook = (typeof fqcsJson)[keyof typeof fqcsJson]
export const FQCS = fqcsJson as Record<string, FqcBook>

export const FQC_WS_SRC: Record<string, string[]> = {
  注塑: ['注塑'],
  注塑毛边: ['注塑毛边'],
  压铸: ['压铸'],
  五金: ['五金'],
  涂装: ['涂装'],
  印刷: ['印刷'],
}

export function fqcKeysOf(ws: WorkshopFilter): string[] {
  return ws === '全部' ? FQC_KEYS.slice() : FQC_WS_SRC[ws] || []
}

export function allFqcRows(): Record<string, unknown>[] {
  return FQC_KEYS.reduce<Record<string, unknown>[]>((a, k) => {
    const rows = (FQCS[k]?.rows as Record<string, unknown>[] | undefined) || []
    return a.concat(rows.map((r) => ({ ...r })))
  }, [])
}

export function aggFqc(keys: string[]) {
  const list = keys.map((k) => FQCS[k]).filter(Boolean)
  if (!list.length) return null
  if (list.length === 1) return list[0]
  const meta = { ...list[0].meta } as Record<string, number | string>
  ;['lots', 'samp', 'ng', 'bad', 'recheck', 'recheckOk', 'recheckNg', 'recheckBlank'].forEach(
    (f) => {
      meta[f] = sum(list, (x) => (x.meta as Record<string, number>)[f] || 0)
    }
  )
  const fr = list.map((x) => x.meta.frm).filter(Boolean).sort()
  const to = list.map((x) => x.meta.to).filter(Boolean).sort()
  meta.frm = fr[0] || ''
  meta.to = to[to.length - 1] || ''
  meta.file = list.map((x) => x.meta.file).join(' / ')
  meta.name = list.map((x) => x.meta.name || x.meta.dept).join(' + ')
  meta.dept = keys.join('+')

  const mm: Record<number, { m: number; lots: number; samp: number; ng: number; bad: number }> = {}
  list.forEach((x) =>
    (x.month || []).forEach((o) => {
      const t = mm[o.m] || (mm[o.m] = { m: o.m, lots: 0, samp: 0, ng: 0, bad: 0 })
      t.lots += o.lots
      t.samp += o.samp
      t.ng += o.ng
      t.bad += o.bad
    })
  )
  const month = Object.keys(mm)
    .map((k) => mm[+k])
    .sort((a, b) => a.m - b.m)
    .map((o) => ({
      m: o.m,
      lots: o.lots,
      samp: Math.round(o.samp),
      ng: o.ng,
      bad: o.bad,
    }))

  const pm: Record<string, { n: string; cnt: number; bad: number }> = {}
  list.forEach((x) =>
    (x.pareto || []).forEach((o) => {
      const t = pm[o.n] || (pm[o.n] = { n: o.n, cnt: 0, bad: 0 })
      t.cnt += o.cnt
      t.bad += o.bad
    })
  )
  const pareto = Object.keys(pm)
    .map((k) => pm[k])
    .sort((a, b) => b.cnt - a.cnt)

  return { meta, month, pareto, parts: list[0].parts, whos: list[0].whos, rows: [] }
}

export function fqcRateRow(r: { stock?: unknown; ng?: unknown }): number {
  const stock = num(r.stock)
  return stock > 0 ? pct(num(r.ng), stock) : 0
}

export function fqcNgInMonth(
  fqcNg: { ws?: string; d?: string }[],
  keys: string[],
  m: number
): number {
  return fqcNg.filter((r) => keys.indexOf(r.ws || '') >= 0 && inMonth(r.d, m)).length
}
