import fqcKeysJson from '@/fixtures/raw/fqc-keys.json'
import fqcsJson from '@/fixtures/raw/fqcs.json'
import { inMonth, num, pct, shortDept, sum } from './format'
import type { FqcNgRow, WorkshopFilter } from './types'

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
  const meta = { ...list[0].meta } as unknown as Record<string, number | string>
  ;['lots', 'samp', 'ng', 'bad', 'recheck', 'recheckOk', 'recheckNg', 'recheckBlank'].forEach(
    (f) => {
      meta[f] = sum(list, (x) => (x.meta as unknown as Record<string, number>)[f] || 0)
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

  const qm: Record<string, { pn: string; ng: number; lots: number; bad: number }> = {}
  list.forEach((x) =>
    (x.parts || []).forEach((o) => {
      const t = qm[o.pn] || (qm[o.pn] = { pn: o.pn, ng: 0, lots: 0, bad: 0 })
      t.ng += o.ng
      t.lots += o.lots
      t.bad += o.bad
    })
  )
  const parts = Object.keys(qm)
    .map((k) => qm[k])
    .sort((a, b) => b.ng - a.ng)
    .slice(0, 16)

  const wm: Record<string, { who: string; ng: number; lots: number; bad: number }> = {}
  list.forEach((x) =>
    (x.whos || []).forEach((o) => {
      const t = wm[o.who] || (wm[o.who] = { who: o.who, ng: 0, lots: 0, bad: 0 })
      t.ng += o.ng
      t.lots += o.lots
      t.bad += o.bad
    })
  )
  const whos = Object.keys(wm)
    .map((k) => wm[k])
    .sort((a, b) => b.lots - a.lots)

  return { meta, month, pareto, parts, whos, act: {}, rows: [] }
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

/** 终检清查记录的「涉及车间」是多值文本，按包含判断归属 */
export function deptsHas(r: { depts?: string }, k: string): boolean {
  return String(r.depts || '')
    .split(/[、,，/]/)
    .some((x) => shortDept(x.trim()) === k)
}

export const FQC_CATS: [string, string[]][] = [
  ['毛边/水口', ['毛边', '披锋', '披风', '毛刺', '合模线', '渣包', '水口', '进胶', '飞边', '多胶', '多料', '毛头', '余料', '胶丝']],
  ['旧品/设变', ['旧品', '设变', '改模', '图纸不符', '版本', '旧模', '旧料', '开发', '变更']],
  ['断裂/裂纹', ['断裂', '裂纹', '裂', '穿', '破', '断', '缺料', '缺胶', '缺口', '打满', '缺肉']],
  ['尺寸不良', ['尺寸', '孔', '长度', '厚度', '超差', '底径', '牙', '螺纹', '位置度', '平面度', '变形量', '深度', '径', '∮', '槽', '移位', '偏']],
  ['外观缺陷', ['缩水', '气纹', '流纹', '烧焦', '黑点', '杂质', '油', '沙粒', '颗粒', '脏', '污', '色差', '变色', '麻点', '粗糙', '磨痕', '拉伤', '料花', '银纹', '发白', '亮印', '水纹', '雾', '痕', '透光', '白条']],
  ['变形', ['变形', '翘', '弯', '不平', '塌']],
  ['碰划伤', ['划伤', '碰伤', '压伤', '刮伤', '擦伤', '碰', '刮', '撞', '伤', '压坏']],
  ['混料/错料', ['混料', '混入', '混', '尾缀', '错料', '混装', '发错']],
  ['加工不良', ['未加工', '漏加工', '后加工', '加工', '沉孔', '倒角', '攻牙', '钻孔', '铣', '车', '钻', '抛光', '打磨']],
  ['装配/功能', ['装配', '手感', '异音', '响', '卡', '干涉', '松', '紧', '弹', '转动', '功能', '音', '坎件']],
  ['涂装/印刷', ['掉漆', '漏印', '印刷', '喷涂', '盐雾', '脱漆', '套色', '油墨', '字码', '丝印']],
]

export function fqcCat(txt: unknown): string {
  const t = String(txt || '')
  for (const [c, ks] of FQC_CATS) if (ks.some((k) => t.includes(k))) return c
  return '其他'
}

export interface FqcMonthStat {
  m: number
  lots: number
  samp: number
  ng: number
  bad: number
  rate: number
  pieceRate: number
}

export function fqcMonthStats(keys: string[]): FqcMonthStat[] {
  const book = aggFqc(keys)
  if (!book) return []
  return (book.month || []).map((o) => ({
    m: o.m,
    lots: o.lots,
    samp: o.samp,
    ng: o.ng,
    bad: o.bad,
    rate: pct(o.ng, o.lots),
    pieceRate: pct(o.bad, o.samp),
  }))
}

export function fqcParetoFromRows(rows: FqcNgRow[]): { n: string; cnt: number }[] {
  const map: Record<string, number> = {}
  rows.forEach((r) => {
    const parts = String(r.defs || r.cat || '未分类')
      .split('、')
      .map((s) => s.trim())
      .filter(Boolean)
    ;(parts.length ? parts : ['未分类']).forEach((k) => {
      map[k] = (map[k] || 0) + 1
    })
  })
  return Object.keys(map)
    .map((n) => ({ n, cnt: map[n] }))
    .sort((a, b) => b.cnt - a.cnt)
}

export interface FqcWhoStat {
  who: string
  ng: number
  lots: number
  bad: number
  rate: number
}

export function fqcInspectorStats(
  rows: FqcNgRow[],
  keys: string[]
): FqcWhoStat[] {
  const book = aggFqc(keys)
  const lotsMap: Record<string, number> = {}
  ;(book?.whos || []).forEach((w) => {
    lotsMap[w.who] = w.lots
  })
  const ngMap: Record<string, number> = {}
  rows.forEach((r) => {
    if (r.who) ngMap[r.who] = (ngMap[r.who] || 0) + 1
  })
  return Object.keys(ngMap)
    .map((who) => {
      const ng = ngMap[who]
      const lots = lotsMap[who] || ng
      return { who, ng, lots, bad: 0, rate: pct(ng, lots) }
    })
    .sort((a, b) => b.lots - a.lots)
}

export interface FqcDisposalStat {
  red: number
  special: number
  scrap: number
  reNg: number
  other: number
}

export function fqcDisposalStats(rows: FqcNgRow[]): FqcDisposalStat {
  const out: FqcDisposalStat = { red: 0, special: 0, scrap: 0, reNg: 0, other: 0 }
  rows.forEach((r) => {
    const a = String(r.act || '')
    if (!a) out.other++
    else if (a.includes('报废')) out.scrap++
    else if (a.includes('放用') || a.includes('签版')) out.special++
    else if (a.includes('重检NG') || a.includes('重检 NG')) out.reNg++
    else if (a.includes('隔离')) out.red++
    else out.other++
  })
  return out
}

/** 高不良以「清查记录」口径判断：不良数 / 库存 ≥ 阈值 */
export function fqcHighRiskRows<T extends { stock?: unknown; ng?: unknown }>(
  rows: T[],
  threshold = 20
): T[] {
  return rows.filter((r) => fqcRateRow(r) >= threshold)
}

export interface FqcPartStat {
  pn: string
  ng: number
  lots: number
  bad: number
}

/** NG TOP 零件按明细聚合；检验批优先取台账号，缺失时退回 NG 批数 */
export function fqcPartsFromRows(
  rows: FqcNgRow[],
  lotsMap: Record<string, number> = {}
): FqcPartStat[] {
  const map: Record<string, FqcPartStat> = {}
  rows.forEach((r) => {
    const pn = String(r.pn || '—')
    const t = map[pn] || (map[pn] = { pn, ng: 0, lots: 0, bad: 0 })
    t.ng++
    t.bad += num(r.bad)
  })
  Object.keys(map).forEach((k) => {
    map[k].lots = lotsMap[k] || map[k].ng
  })
  return Object.keys(map)
    .map((k) => map[k])
    .sort((a, b) => b.ng - a.ng)
}

export function fqcBookOf(keys: string[]) {
  return keys.length === 1 ? FQCS[keys[0]] : null
}
