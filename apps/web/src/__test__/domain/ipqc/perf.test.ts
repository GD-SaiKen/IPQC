import { describe, expect, it } from 'vitest'
import {
  computePerf,
  PERF_RULES,
  perfAttrStats,
  perfAverage,
  perfGrade,
  perfGradeCounts,
} from '@/domain/ipqc/perf'
import type { PerfRecord } from '@/domain/ipqc/types'

describe('perf', () => {
  it('等级阈值 105 / 100 / 95', () => {
    expect(perfGrade(105)).toBe('A')
    expect(perfGrade(104.9)).toBe('B')
    expect(perfGrade(100)).toBe('B')
    expect(perfGrade(99.9)).toBe('C')
    expect(perfGrade(95)).toBe('C')
    expect(perfGrade(94.9)).toBe('D')
  })

  it('多人责任按 / 与 、 均分，个月均分 = 100 + 净加减分平均', () => {
    const rows: PerfRecord[] = [
      { date: '2026-01-02', dept: '注塑', who: '雷庆杰/王双乐', attr: '技能', item: 'a', score: 10 },
      { date: '2026-01-03', dept: '注塑', who: '雷庆杰', attr: '纪律', item: 'b', score: -4 },
      { date: '2026-02-03', dept: '注塑', who: '王双乐、雷庆杰', attr: '团队协作', item: 'c', score: 6 },
    ]
    const out = computePerf(rows)
    const lei = out.find((x) => x.name === '雷庆杰')!
    expect(lei.cnt).toBe(3)
    expect(lei.months['2026-01']).toBeCloseTo(1, 6)
    expect(lei.months['2026-02']).toBeCloseTo(3, 6)
    expect(lei.total).toBe(102)
    expect(lei.add).toBe(2)
    expect(lei.sub).toBe(0)
  })

  it('A/B/C/D 人数', () => {
    const out = computePerf([
      { date: '2026-01-02', dept: '注塑', who: '雷庆杰', attr: '技能', item: '', score: 8 },
      { date: '2026-01-02', dept: '注塑', who: '王双乐', attr: '技能', item: '', score: 0 },
      { date: '2026-01-02', dept: '注塑', who: '贺智强', attr: '纪律', item: '', score: -4 },
      { date: '2026-01-02', dept: '注塑', who: '龙露冰', attr: '纪律', item: '', score: -12 },
    ])
    expect(perfGradeCounts(out)).toEqual({ A: 1, B: 1, C: 1, D: 1 })
    expect(perfAverage(out)).toBeCloseTo(98, 1)
  })

  it('加减分构成按属性汇总', () => {
    const stats = perfAttrStats([
      { date: '2026-01-02', dept: '注塑', who: '雷庆杰', attr: '技能', item: '', score: 6 },
      { date: '2026-01-02', dept: '注塑', who: '雷庆杰', attr: '纪律', item: '', score: -2 },
    ])
    expect(stats.add.find((x) => x.label === '技能')?.text).toBe('+6.0')
    expect(stats.sub.find((x) => x.label === '纪律')?.text).toBe('-2.0')
  })

  it('考核规则全文可读且不含工资金额', () => {
    expect(PERF_RULES.length).toBe(4)
    const text = JSON.stringify(PERF_RULES)
    expect(text).not.toMatch(/元|工资/)
  })
})
