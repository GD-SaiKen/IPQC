import { describe, expect, it } from 'vitest'
import { createDefaultDb, getCheckScores } from '@/domain/ipqc/seed'
import { inMonth, shortDept, sum } from '@/domain/ipqc/format'
import { wsKpi } from '@/domain/ipqc/kpi'
import {
  trainingStats,
  visibleExam,
  visibleMaterial,
  visibleRecord,
} from '@/domain/ipqc/training'
import type { TrainingExam, TrainingRecord } from '@/domain/ipqc/types'

describe('training · 通用记录', () => {
  const db = createDefaultDb()
  const records = db.trn as unknown as TrainingRecord[]

  it('通用资料、实施记录与考核在各车间可见，他车间专用记录不可见', () => {
    expect(visibleMaterial({ dept: '通用' }, '注塑')).toBe(true)
    expect(visibleRecord({ dept: '通用' }, '注塑')).toBe(true)
    expect(visibleExam({ dept: '通用' }, '注塑')).toBe(true)
    expect(visibleRecord({ dept: '压铸' }, '注塑')).toBe(false)
    expect(visibleExam({ dept: '压铸' } as TrainingExam, '注塑')).toBe(false)
  })

  it('车间页培训统计包含通用场次与人次', () => {
    const list = records.filter((r) => visibleRecord(r, '注塑'))
    const stats = trainingStats([], list, [])
    const general = records.filter((r) => r.dept === '通用')
    expect(stats.sessions).toBe(list.length)
    expect(stats.people).toBe(sum(list, (r) => Number(r.num) || 0))
    expect(stats.people).toBeGreaterThanOrEqual(
      sum(general, (r) => Number(r.num) || 0)
    )
  })

  it('车间 KPI 培训人次纳入通用记录', () => {
    const scores = getCheckScores()
    const general = records.filter(
      (r) => r.dept === '通用' && inMonth(r.date, 3)
    )
    const own = records.filter(
      (r) => shortDept(r.dept) === '注塑' && inMonth(r.date, 3)
    )
    expect(general.length).toBeGreaterThan(0)
    const k = wsKpi(db, scores, '注塑', 3)
    expect(k.trnN).toBe(own.length + general.length)
    expect(k.trnP).toBe(
      sum([...own, ...general], (r) => Number(r.num) || 0)
    )
  })
})
