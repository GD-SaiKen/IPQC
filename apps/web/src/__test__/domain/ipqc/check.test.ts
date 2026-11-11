import { describe, expect, it } from 'vitest'
import {
  CHK_FULL,
  CHK_TARGET,
  chkDailyCells,
  chkItemRows,
  chkItemTotal,
  chkMax,
  chkMonthScore,
  chkRank,
  chkStats,
  chkTrend,
} from '@/domain/ipqc/check'
import { getCheckScores } from '@/domain/ipqc/seed'
import { WORKSHOPS } from '@/domain/ipqc/workshops'

const scores = getCheckScores()
const keys = WORKSHOPS.map((w) => w.key)

describe('chk', () => {
  it('全表满分 140、目标 100；毛边适用项 40 / 60', () => {
    expect(CHK_FULL).toBe(140)
    expect(CHK_TARGET).toBe(100)
    expect(chkMax(scores, '注塑')).toBe(140)
    expect(chkMax(scores, '注塑毛边', 9)).toBe(40)
    expect(chkMax(scores, '注塑毛边', 10)).toBe(60)
  })

  it('总看板取月分或全年均值', () => {
    expect(chkMonthScore(scores, '注塑', 10)).toBe(93)
    expect(chkMonthScore(scores, '注塑', 0)).toBeGreaterThan(90)
  })

  it('排名按最近一次实测分，6 区同表', () => {
    const rank = chkRank(scores, keys)
    expect(rank.length).toBe(6)
    expect(rank[0].latest).toBeGreaterThanOrEqual(rank[rank.length - 1].latest)
  })

  it('月趋势按当月适用满分归一，不借用最近月满分', () => {
    const rank = chkRank(scores, ['注塑毛边'])
    expect(rank[0].max).toBe(60)
    expect(rank[0].trend[0]).toBeCloseTo(85.5, 1)
    expect(rank[0].trend[9]).toBeCloseTo(95.5, 1)
  })

  it('趋势 1–10 月，缺月为 null', () => {
    const t = chkTrend(scores, '注塑')
    expect(t.length).toBe(10)
    expect(t[9]).toBe(93)
    const partial = chkTrend({ 注塑: { 1: 92 } }, '注塑')
    expect(partial[0]).toBe(92)
    expect(partial[1]).toBeNull()
  })

  it('项明细分值合计与 140 / 毛边 40 对齐', () => {
    expect(chkItemTotal('注塑')).toBe(140)
    expect(chkItemTotal('注塑毛边')).toBe(0)
    expect(chkItemRows('注塑毛边', null)).toEqual([])
    const rows = chkItemRows('注塑', null)
    expect(rows.length).toBe(23)
    expect(rows.every((r) => r.last === null)).toBe(true)
  })

  it('30 日色块按当月适用项满分判色', () => {
    const cells = chkDailyCells(scores, [{ m: 9, s: 40 }, { m: 10, s: 57.3 }], '注塑毛边')
    expect(cells[0].ratio).toBe(1)
    expect(cells[1].ratio).toBeCloseTo(57.3 / 60, 3)
  })

  it('统计含毛边与剔除毛边均值', () => {
    const s = chkStats(scores, keys)
    expect(s.zones).toBe(6)
    expect(s.avg).not.toBeNull()
    expect(s.avgEx).not.toBeNull()
  })
})
