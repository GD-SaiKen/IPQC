import { num, pct, sum } from './format'

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

export function faStats(list: { result: string; fb?: unknown; iv?: unknown; status: string }[]): FaStats {
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
