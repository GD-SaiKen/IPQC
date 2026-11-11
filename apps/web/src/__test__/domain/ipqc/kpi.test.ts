import { describe, expect, it } from 'vitest'
import { createDefaultDb, getCheckScores } from '@/domain/ipqc/seed'
import { allKpi, boardAlerts, wsKpi } from '@/domain/ipqc/kpi'
import { cmpStats } from '@/domain/ipqc/cmp'
import { faStats } from '@/domain/ipqc/fa-rules'
import { inMonth, shortDept } from '@/domain/ipqc/format'
import { boardMatrix, checkTrend, complaintTrend, heatOf } from '@/domain/ipqc/trend'

describe('kpi', () => {
  const db = createDefaultDb()
  const scores = getCheckScores()

  it('全厂 KPI 有合理形状', () => {
    const a = allKpi(db, scores, 0)
    expect(a.fqcLots).toBeGreaterThan(0)
    expect(a.chkAvg).not.toBeNull()
  })

  it('注塑毛边首件可为空', () => {
    const k = wsKpi(db, scores, '注塑毛边', 0)
    expect(k.faOK).toBeNull()
    expect(k.faN).toBe(0)
  })
})

describe('kpi · 热力矩阵与走势', () => {
  const db = createDefaultDb()
  const scores = getCheckScores()

  it('矩阵按车间与月份展开，全厂合计独立计算', () => {
    const m = boardMatrix(db, scores, 'faOK')
    expect(m.months.length).toBe(10)
    expect(m.rows.length).toBe(6)
    expect(m.rows[0].cells.length).toBe(10)
    expect(m.rows.every((r) => r.all != null || r.cells.every((c) => c == null))).toBe(true)
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
    const jan = allKpi(db, scores, 1)
    const feb = allKpi(db, scores, 2)
    expect(jan.cmpN).not.toBe(feb.cmpN)
  })

  it('点检走势缺月保留 null，不回落为 0', () => {
    const chk = checkTrend({ 注塑: { 1: 92 } }, '注塑')
    expect(chk[0].data[0]).toBe(92)
    expect(chk[0].data[1]).toBeNull()
  })
})

describe('kpi · 车间总览月份口径', () => {
  const db = createDefaultDb()
  const scores = getCheckScores()

  it('车间总览 KPI 跟随所选月份，与总看板同月一致', () => {
    const jan = wsKpi(db, scores, '注塑', 1)
    const year = wsKpi(db, scores, '注塑', 0)
    expect(jan.faN).toBeLessThan(year.faN)
    expect(jan.faOK).not.toBe(year.faOK)
    expect(jan.cmpClose).not.toBe(year.cmpClose)
    expect(jan.faOK).toBeCloseTo(50, 1)
    expect(jan.cmpClose).toBeCloseTo(100, 1)
    expect(jan.fqcRate).toBeCloseTo(7.42, 2)
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
  const scores = getCheckScores()

  it('终检超 3% 与投诉未结多于阈值时给出其余汇总', () => {
    const list = boardAlerts(db, scores, 0)
    const fq = list.filter((a) => a.t.includes('终检批次不良率'))
    expect(fq.length).toBeGreaterThan(2)
    expect(fq.some((a) => a.t === '其余车间终检批次不良率超 3%')).toBe(true)
    expect(list.some((a) => a.t === '其余车间投诉未结案')).toBe(true)
  })

  it('关注区最多 9 条', () => {
    expect(boardAlerts(db, scores, 0).length).toBeLessThanOrEqual(9)
  })
})
