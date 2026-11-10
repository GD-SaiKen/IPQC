import { num, pct, shortDept, sum } from './format'

export const FA_STAGES = ['新产品TH RUN样品', '销售员样品', '量产'] as const

const FA_OWNER_DEVQE = {
  short: '开发+QE',
  role: '开发工程师 + QE 工程师',
} as const

const FA_OWNER_PE = {
  short: '工艺',
  role: '工艺工程师',
} as const

export function isNewProdStage(stage: string): boolean {
  return stage === '新产品TH RUN样品' || stage === '销售员样品'
}

export function faOwnerRole(stage: string): string {
  if (String(stage || '').toUpperCase() === 'OK') return '—'
  return isNewProdStage(stage) ? FA_OWNER_DEVQE.role : FA_OWNER_PE.role
}

export function faNgConfirmLabel(result: string, stage: string): string {
  if (String(result).toUpperCase() !== 'NG') return '—'
  return faOwnerRole(stage)
}

export interface FaStats {
  total: number
  ng: number
  ngRate: number
  fbRate: number
  ivRate: number
  avgFb: number
  avgIv: number
  open: number
}

export function faStats(list: { result: string; fb?: unknown; iv?: unknown; status?: string }[]): FaStats {
  const ng = list.filter((r) => String(r.result).toUpperCase() === 'NG')
  const fb = ng.filter((r) => num(r.fb) > 0)
  const iv = ng.filter((r) => num(r.iv) > 0)
  const okfb = fb.filter((r) => num(r.fb) <= 5).length
  const okiv = iv.filter((r) => num(r.iv) <= 15).length
  return {
    total: list.length,
    ng: ng.length,
    ngRate: pct(ng.length, list.length),
    fbRate: pct(okfb, fb.length),
    ivRate: pct(okiv, iv.length),
    avgFb: fb.length ? sum(fb, (r) => num(r.fb)) / fb.length : 0,
    avgIv: iv.length ? sum(iv, (r) => num(r.iv)) / iv.length : 0,
    open: ng.filter((r) => r.status !== '已关闭').length,
  }
}

export interface FaStep {
  n: number
  title: string
  desc: string
  owner: string
  limit: string
  tone: 'normal' | 'dan' | 'warn'
}

export const FA_STEPS: FaStep[] = [
  {
    n: 1,
    title: '判定 NG，隔离不良',
    desc: '挂红标、隔离不良，通知当班组长',
    owner: '检验员',
    limit: '即时',
    tone: 'normal',
  },
  {
    n: 2,
    title: '5 分钟内反馈',
    desc: '记录 NG 反馈分钟数，页面标红；本期不推送消息',
    owner: '检验员',
    limit: '5 分钟',
    tone: 'dan',
  },
  {
    n: 3,
    title: '15 分钟内介入',
    desc: '到场确认原因，给出临时对策与永久对策',
    owner: '生产负责人、工艺工程师',
    limit: '15 分钟',
    tone: 'warn',
  },
  {
    n: 4,
    title: '无对策不得生产',
    desc: '未改善或未确认 OK，不得开机或继续生产',
    owner: '生产负责人',
    limit: '持续至放行',
    tone: 'dan',
  },
  {
    n: 5,
    title: '复检确认 / 结案',
    desc: '改善后重新首件确认，留样并录入',
    owner: '检验员',
    limit: '改善后',
    tone: 'normal',
  },
]

export const FA_STAGE_OPTIONS = ['全部', ...FA_STAGES] as const

export interface FaFocusMonth {
  n: number
  ng: number
}

export interface FaFocus {
  pn: string
  n: number
  ng: number
  byMonth: Record<string, FaFocusMonth>
  byWho: Record<string, FaFocusMonth>
}

/** 重点零件 100394-003：源表逐尺寸归并后按「日期 + 检验员」批次统计 */
export function faFocus(
  list: { date?: string; pn?: string; result?: string; who?: string }[],
  pn = '100394-003'
): FaFocus {
  const raw = list.filter((r) => String(r.pn) === pn)
  const f: FaFocus = { pn, n: raw.length, ng: 0, byMonth: {}, byWho: {} }
  raw.forEach((r) => {
    const ng = String(r.result).toUpperCase() === 'NG'
    if (ng) f.ng++
    const m = String(r.date || '').slice(0, 7) || '历史'
    const bm = f.byMonth[m] || (f.byMonth[m] = { n: 0, ng: 0 })
    bm.n++
    if (ng) bm.ng++
    const w = r.who || '未署'
    const bw = f.byWho[w] || (f.byWho[w] = { n: 0, ng: 0 })
    bw.n++
    if (ng) bw.ng++
  })
  return f
}

export interface FaFeedbackBucket {
  label: string
  count: number
  color: string
}

export function faFeedbackBuckets(
  list: { result: string; fb?: unknown }[]
): FaFeedbackBucket[] {
  const buckets: FaFeedbackBucket[] = [
    { label: '≤3 分钟', count: 0, color: '#0f9d58' },
    { label: '4–5 分钟', count: 0, color: '#65a30d' },
    { label: '6–10 分钟', count: 0, color: '#d97706' },
    { label: '11–15 分钟', count: 0, color: '#ea580c' },
    { label: '>15 分钟', count: 0, color: '#dc2626' },
  ]
  list
    .filter((r) => String(r.result).toUpperCase() === 'NG')
    .forEach((r) => {
      const f = num(r.fb)
      const i = f <= 3 ? 0 : f <= 5 ? 1 : f <= 10 ? 2 : f <= 15 ? 3 : 4
      buckets[i].count++
    })
  return buckets
}

export function faNgRateByWorkshop(
  list: { dept?: string; result: string }[]
): Record<string, FaStats> {
  const out: Record<string, FaStats> = {}
  const keys = new Set(list.map((r) => shortDept(r.dept)))
  keys.forEach((k) => {
    out[k] = faStats(list.filter((r) => shortDept(r.dept) === k))
  })
  return out
}
