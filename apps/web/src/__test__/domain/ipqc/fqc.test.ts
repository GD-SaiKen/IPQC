import { describe, expect, it } from 'vitest'
import {
  aggFqc,
  deptsHas,
  fqcCat,
  fqcHighRiskRows,
  fqcMonthStats,
  fqcNgInMonth,
  fqcParetoFromRows,
  fqcRateRow,
  fqcKeysOf,
} from '@/domain/ipqc/fqc'

describe('fqc', () => {
  it('一车间一本；全厂为 6 本相加', () => {
    const one = aggFqc(['注塑'])
    const all = aggFqc(['注塑', '注塑毛边', '压铸', '五金', '涂装', '印刷'])
    expect(one?.meta.lots).toBeGreaterThan(0)
    expect(all?.meta.lots).toBeGreaterThan(Number(one!.meta.lots))
  })

  it('批次不良率与件不良率口径', () => {
    const s = fqcMonthStats(['注塑'])
    expect(s.length).toBe(10)
    expect(s[0].rate).toBeCloseTo((s[0].ng / s[0].lots) * 100, 6)
    expect(s[0].pieceRate).toBeCloseTo((s[0].bad / s[0].samp) * 100, 6)
  })

  it('清查记录按涉及车间多值归属', () => {
    expect(deptsHas({ depts: '仓库、毛边、注塑' }, '注塑')).toBe(true)
    expect(deptsHas({ depts: '仓库、毛边' }, '注塑')).toBe(false)
  })

  it('柏拉图按缺陷项次，多缺陷批重复计', () => {
    const rows = fqcParetoFromRows([
      { defs: '毛边、尺寸不良' },
      { defs: '毛边' },
    ])
    expect(rows.find((x) => x.n === '毛边')?.cnt).toBe(2)
    expect(rows.find((x) => x.n === '尺寸不良')?.cnt).toBe(1)
  })

  it('单条不良率 ≥20% 触发高不良', () => {
    const rows = fqcHighRiskRows([{ samp: 50, bad: 10 }, { samp: 100, bad: 5 }])
    expect(rows.length).toBe(1)
  })

  it('不良描述归入固定类别', () => {
    expect(fqcCat('水口残留')).toBe('毛边/水口')
    expect(fqcCat('尺寸超差')).toBe('尺寸不良')
    expect(fqcCat('无法归类')).toBe('其他')
  })

  it('NG 批按车间与月份过滤', () => {
    const one = fqcNgInMonth([{ ws: '注塑', d: '2026-10-02' }], ['注塑'], 10)
    const other = fqcNgInMonth([{ ws: '压铸', d: '2026-10-02' }], ['注塑'], 10)
    expect(one).toBe(1)
    expect(other).toBe(0)
  })

  it('清查记录不良率分母为 0 时返回 0', () => {
    expect(fqcRateRow({ stock: 0, ng: 3 })).toBe(0)
    expect(fqcRateRow({ stock: 100, ng: 5 })).toBe(5)
  })

  it('可用台账来源随车间切换', () => {
    expect(fqcKeysOf('注塑')).toEqual(['注塑'])
    expect(fqcKeysOf('全部').length).toBe(6)
  })
})
