import { describe, expect, it } from 'vitest'
import { createDefaultDb, getCheckScores } from '@/domain/ipqc/seed'
import { allKpi, wsKpi } from '@/domain/ipqc/kpi'

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
