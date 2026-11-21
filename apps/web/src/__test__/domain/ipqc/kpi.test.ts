import { describe, expect, it } from 'vitest'
import type { CheckScores, IpqcDb } from '@/domain/ipqc/types'
import { createDefaultDb } from '@/domain/ipqc/seed'
import { allKpi, boardAlerts, wsKpi } from '@/domain/ipqc/kpi'
import { cmpStats } from '@/domain/ipqc/cmp'
import { faStats } from '@/domain/ipqc/fa-rules'
import { inMonth, shortDept } from '@/domain/ipqc/format'
import { boardMatrix, checkTrend, complaintTrend, heatOf } from '@/domain/ipqc/trend'

const sampleScores: CheckScores = {
  注塑: { 1: 88, 2: 90, 10: 93 },
  注塑毛边: { 9: 40, 10: 57.3 },
}

const sampleDb: IpqcDb = {
  ...createDefaultDb(),
  fa: [
    {
      date: '2026-01-05',
      stage: '量产',
      dept: '注塑',
      pn: '1001',
      part: '主体',
      item: '尺寸',
      spec: '—',
      meas: '合格',
      result: 'OK',
      who: '检验员',
      fb: '',
      iv: '',
      status: '已放行',
      action: '首件OK',
      eng: '',
      src: '实测',
    },
    {
      date: '2026-01-06',
      stage: '量产',
      dept: '注塑',
      pn: '1002',
      part: '盖',
      item: '外观',
      spec: '—',
      meas: 'NG',
      result: 'NG',
      who: '检验员',
      fb: '2',
      iv: '5',
      status: '整改中',
      action: '调机',
      eng: '',
      src: '实测',
    },
    {
      date: '2026-02-01',
      stage: '量产',
      dept: '注塑',
      pn: '1003',
      part: '轴',
      item: '尺寸',
      spec: '—',
      meas: '合格',
      result: 'OK',
      who: '检验员',
      fb: '',
      iv: '',
      status: '已放行',
      action: '首件OK',
      eng: '',
      src: '实测',
    },
  ],
  cmp: [
    {
      date: '2026-01-03',
      dept: '注塑',
      pn: '2001',
      part: '件',
      issue: '问题',
      actClose: '2026-01-10',
    } as IpqcDb['cmp'][number],
    {
      date: '2026-02-04',
      dept: '注塑',
      pn: '2002',
      part: '件',
      issue: '问题',
    } as IpqcDb['cmp'][number],
    {
      date: '2026-02-15',
      dept: '注塑',
      pn: '2003',
      part: '件',
      issue: '问题',
    } as IpqcDb['cmp'][number],
  ],
}

describe('kpi', () => {
  const db = createDefaultDb()
  const scores = {} as CheckScores

  it('无种子时全厂 KPI 为空口径', () => {
    const a = allKpi(db, scores, 0)
    expect(a.fqcLots).toBe(0)
    expect(a.chkAvg).toBeNull()
  })

  it('注塑毛边首件可为空', () => {
    const k = wsKpi(db, scores, '注塑毛边', 0)
    expect(k.faOK).toBeNull()
    expect(k.faN).toBe(0)
  })
})

describe('kpi · 热力矩阵与走势', () => {
  const db = createDefaultDb()
  const scores = sampleScores

  it('矩阵按车间与月份展开，全厂合计独立计算', () => {
    const m = boardMatrix(db, scores, 'faOK')
    expect(m.months.length).toBe(10)
    expect(m.rows.length).toBe(6)
    expect(m.rows[0].cells.length).toBe(10)
    expect(m.rows.every((r) => r.all == null || r.cells.every((c) => c == null))).toBe(true)
  })

  it('无数据格为 null 而不是 0', () => {
    const m = boardMatrix(db, scores, 'faOK')
    const off = m.rows.find((r) => r.key === '注塑毛边')!
    expect(off.all).toBeNull()
  })

  it('投诉与点检走势覆盖 1–10 月', () => {
    const cmp = complaintTrend(db, '全部')
    const chk = checkTrend(scores, '全部')
    expect(cmp.length).toBe(6)
    expect(chk.length).toBe(6)
    expect(cmp[0].data.length).toBe(10)
    expect(chk[0].data.length).toBe(10)
  })

  it('热力色阶在同一指标内相对比较', () => {
    const high = heatOf(0.95)
    const low = heatOf(0.1)
    const empty = heatOf(null)
    expect(high.fg).not.toBe(low.fg)
    expect(empty.bg).toBe('#f6f8fb')
  })

  it('投诉批次按月随月份变化', () => {
    const jan = allKpi(sampleDb, scores, 1)
    const feb = allKpi(sampleDb, scores, 2)
    expect(jan.cmpN).not.toBe(feb.cmpN)
  })

  it('点检走势缺月保留 null，不回落为 0', () => {
    const chk = checkTrend({ 注塑: { 1: 92 } }, '注塑')
    expect(chk[0].data[0]).toBe(92)
    expect(chk[0].data[1]).toBeNull()
  })
})

describe('kpi · 车间总览月份口径', () => {
  const db = sampleDb
  const scores = sampleScores

  it('车间总览 KPI 跟随所选月份，与总看板同月一致', () => {
    const jan = wsKpi(db, scores, '注塑', 1)
    const year = wsKpi(db, scores, '注塑', 0)
    expect(jan.faN).toBeLessThan(year.faN)
    expect(jan.faOK).not.toBe(year.faOK)
    expect(jan.faOK).toBeCloseTo(50, 1)
    expect(jan.cmpClose).toBeCloseTo(100, 1)
    expect(year.cmpClose).toBeCloseTo(33.3, 1)
    expect(jan.fqcRate).toBeNull()
  })

  it('首件与投诉明细按同一月份过滤后与 KPI 对齐', () => {
    const janFa = db.fa.filter(
      (r) => shortDept(r.dept) === '注塑' && inMonth(r.date, 1)
    )
    const janCmp = db.cmp.filter(
      (c) => shortDept(c.dept) === '注塑' && inMonth(c.date, 1)
    )
    const k = wsKpi(db, scores, '注塑', 1)
    expect(100 - faStats(janFa).ngRate).toBeCloseTo(k.faOK!, 5)
    expect(cmpStats(janCmp).closeRate).toBeCloseTo(k.cmpClose!, 5)
  })
})

describe('kpi · 关注区汇总', () => {
  const db = createDefaultDb()
  const scores = {} as CheckScores

  it('无种子时不产生终检与投诉告警', () => {
    const list = boardAlerts(db, scores, 0)
    const fq = list.filter((a) => a.t.includes('终检批次不良率'))
    expect(fq.length).toBe(0)
    expect(list.some((a) => a.t === '其余车间投诉未结案')).toBe(false)
  })

  it('关注区最多 9 条', () => {
    expect(boardAlerts(db, scores, 0).length).toBeLessThanOrEqual(9)
  })
})