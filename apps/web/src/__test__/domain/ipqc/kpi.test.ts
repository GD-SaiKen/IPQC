import { describe, expect, it } from 'vitest'
import { createDefaultDb, getCheckScores } from '@/domain/ipqc/seed'
import { allKpi, wsKpi } from '@/domain/ipqc/kpi'
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
})
