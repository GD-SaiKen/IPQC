import { CHK_APPLY, chkMonthScore, CHK_TARGET } from './check'
import { faStats } from './fa-rules'
import { aggFqc, fqcKeysOf, fqcNgInMonth } from './fqc'
import { inMonth, pct, shortDept, sum } from './format'
import { computePerf } from './perf'
import type { CheckScores, IpqcDb, WorkshopKey } from './types'
import { WORKSHOPS } from './workshops'

export interface WsKpi {
  faN: number
  faNg: number
  faOK: number | null
  cmpN: number
  cmpOpen: number
  cmpClose: number | null
  chk: number | null
  chkOK: boolean
  perfN: number
  perf: number | null
  trnN: number
  trnP: number
  fqcLots: number
  fqcNg: number
  fqcRate: number | null
}

export function wsKpi(
  db: IpqcDb,
  checkScores: CheckScores,
  key: WorkshopKey,
  m: number
): WsKpi {
  const same = (r: { dept?: unknown }) => shortDept(String(r.dept ?? '')) === key
  const fa = db.fa.filter((r) => same(r) && inMonth(r.date, m))
  const cm = db.cmp.filter((r) => same(r) && inMonth(r.date, m))
  const pf = db.perf.filter((r) => same(r) && inMonth(r.date, m))
  const tr = db.trn.filter((r) => same(r) && inMonth(r.date, m))
  const ngFa = fa.filter((r) => String(r.result).toUpperCase() === 'NG').length
  const closed = cm.filter((c) => c.actClose).length
  const chk = chkMonthScore(checkScores, key, m)
  const srcs = fqcKeysOf(key)
  const fqBase = aggFqc(srcs)
  const fqLots = fqBase ? sum(fqBase.month.filter((x) => !m || x.m === m), (x) => x.lots) : 0
  const fqNg = fqcNgInMonth(db.fqcNg as { ws?: string; d?: string }[], srcs, m)
  const ps = computePerf(pf)
  return {
    faN: fa.length,
    faNg: ngFa,
    faOK: fa.length ? 100 - pct(ngFa, fa.length) : null,
    cmpN: cm.length,
    cmpOpen: cm.length - closed,
    cmpClose: cm.length ? pct(closed, cm.length) : null,
    chk,
    chkOK: chk != null && chk >= 100,
    perfN: ps.length,
    perf: ps.length ? +(sum(ps, (x) => x.total) / ps.length).toFixed(1) : null,
    trnN: tr.length,
    trnP: sum(tr, (r) => Number(r.num) || 0),
    fqcLots: fqLots,
    fqcNg: fqNg,
    fqcRate: fqLots ? pct(fqNg, fqLots) : null,
  }
}

export function allKpi(db: IpqcDb, checkScores: CheckScores, m: number) {
  const fa = db.fa.filter((r) => inMonth(r.date, m))
  const cm = db.cmp.filter((r) => inMonth(r.date, m))
  const pf = db.perf.filter((r) => inMonth(r.date, m))
  const tr = db.trn.filter((r) => inMonth(r.date, m))
  const ngFa = fa.filter((r) => String(r.result).toUpperCase() === 'NG').length
  const closed = cm.filter((c) => c.actClose).length
  const fqAll = aggFqc(fqcKeysOf('全部'))
  const fqLots = fqAll ? sum(fqAll.month.filter((x) => !m || x.m === m), (x) => x.lots) : 0
  const fqNg = fqcNgInMonth(db.fqcNg as { ws?: string; d?: string }[], fqcKeysOf('全部'), m)
  const ps = computePerf(pf)

  const chkOf = (w: WorkshopKey) => chkMonthScore(checkScores, w, m)
  const chkV = WORKSHOPS.map((w) => chkOf(w.key)).filter((v) => v != null && Number.isFinite(v)) as number[]
  const chkExV = WORKSHOPS.filter((w) => !CHK_APPLY[w.key])
    .map((w) => chkOf(w.key))
    .filter((v) => v != null && Number.isFinite(v)) as number[]

  return {
    faN: fa.length,
    faNg: ngFa,
    faOK: fa.length ? 100 - pct(ngFa, fa.length) : null,
    cmpN: cm.length,
    cmpOpen: cm.length - closed,
    cmpClose: cm.length ? pct(closed, cm.length) : null,
    chkAvg: chkV.length ? +(chkV.reduce((a, b) => a + b, 0) / chkV.length).toFixed(1) : null,
    chkOK: chkV.filter((v) => v >= 100).length,
    chkTotal: chkV.length,
    chkAvgEx: chkExV.length ? +(chkExV.reduce((a, b) => a + b, 0) / chkExV.length).toFixed(1) : null,
    chkOKEx: chkExV.filter((v) => v >= 100).length,
    chkTotalEx: chkExV.length,
    perfN: ps.length,
    perf: ps.length ? +(sum(ps, (x) => x.total) / ps.length).toFixed(1) : null,
    trnN: tr.length,
    trnP: sum(tr, (r) => Number(r.num) || 0),
    fqcLots: fqLots,
    fqcNg: fqNg,
    fqcRate: fqLots ? pct(fqNg, fqLots) : null,
  }
}

export interface BoardAlert {
  pri: number
  lv: 'dan' | 'warn'
  t: string
  d: string
  ws?: WorkshopKey
}

export function boardAlerts(
  db: IpqcDb,
  checkScores: CheckScores,
  m: number
): BoardAlert[] {
  const out: BoardAlert[] = []
  WORKSHOPS.forEach((w) => {
    const k = wsKpi(db, checkScores, w.key, m)
    if (k.faN && k.faOK != null && k.faOK < 60) {
      out.push({
        pri: 1,
        lv: 'dan',
        t: `${w.name} 首件合格率偏低`,
        d: `${k.faN} 批首件 · NG ${k.faNg} 批`,
        ws: w.key,
      })
    }
    if (k.chk != null && k.chk < 90) {
      out.push({
        pri: 2,
        lv: 'dan',
        t: `${w.name} 点检严重未达标`,
        d: `${m ? `${m} 月` : '全年均'} ${k.chk} 分`,
        ws: w.key,
      })
    } else if (k.chk != null && k.chk < CHK_TARGET) {
      out.push({
        pri: 5,
        lv: 'warn',
        t: `${w.name} 点检未达标`,
        d: `${k.chk} 分 · 目标 ${CHK_TARGET}`,
        ws: w.key,
      })
    }
    if (m && k.trnN === 0) {
      out.push({
        pri: 6,
        lv: 'warn',
        t: `${w.name} 本月无培训记录`,
        d: `${m} 月未安排培训`,
        ws: w.key,
      })
    }
  })

  const fqBad = WORKSHOPS.map((w) => ({ w, k: wsKpi(db, checkScores, w.key, m) }))
    .filter((o) => o.k.fqcRate != null && o.k.fqcRate > 3)
    .sort((x, y) => (y.k.fqcRate || 0) - (x.k.fqcRate || 0))
  fqBad.slice(0, 2).forEach((o) =>
    out.push({
      pri: 2,
      lv: 'dan',
      t: `${o.w.name} 终检批次不良率超 3%`,
      d: `${o.k.fqcRate?.toFixed(2)}%`,
      ws: o.w.key,
    })
  )

  const openList = WORKSHOPS.map((w) => ({ w, k: wsKpi(db, checkScores, w.key, m) }))
    .filter((o) => o.k.cmpOpen > 0)
    .sort((x, y) => y.k.cmpOpen - x.k.cmpOpen)
  openList.slice(0, 3).forEach((o) =>
    out.push({
      pri: 3,
      lv: 'dan',
      t: `${o.w.name} 投诉未结案`,
      d: `${o.k.cmpOpen} 批未结`,
      ws: o.w.key,
    })
  )

  return out.sort((x, y) => x.pri - y.pri).slice(0, 9)
}

export { faStats, computePerf }
