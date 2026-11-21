import { describe, expect, it } from 'vitest'

import { applySync, checkScoreMapKey } from '../../../modules/ledger-sync/apply-sync'

describe('applySync', () => {
  it('无键则新增', () => {
    const result = applySync({
      grids: { fa: [], fqcNg: [], fqc: [], cmp: [], perf: [] },
      tombstones: new Set(),
      shareRows: [
        {
          table: 'fa',
          sourceKey: 'k1',
          fields: { date: '2026-01-01', dept: '注塑', pn: 'P', item: '外观', stage: '量产' },
        },
      ],
      checkScores: { existing: new Map(), incoming: new Map() },
    })
    expect(result.inserts).toHaveLength(1)
    expect(result.addedCount).toBe(1)
  })

  it('相同则跳过', () => {
    const result = applySync({
      grids: {
        fa: [{ id: 'id1', sourceKey: 'k1', fields: { date: 'd', who: '张三', result: 'OK' } }],
        fqcNg: [],
        fqc: [],
        cmp: [],
        perf: [],
      },
      tombstones: new Set(),
      shareRows: [
        { table: 'fa', sourceKey: 'k1', fields: { date: 'd', who: '张三', result: 'OK' } },
      ],
      checkScores: { existing: new Map(), incoming: new Map() },
    })
    expect(result.inserts).toHaveLength(0)
    expect(result.skippedCount).toBe(1)
  })

  it('不同则保留系统值并写 diff', () => {
    const result = applySync({
      grids: {
        fa: [{ id: 'id1', sourceKey: 'k1', fields: { result: 'OK' } }],
        fqcNg: [],
        fqc: [],
        cmp: [],
        perf: [],
      },
      tombstones: new Set(),
      shareRows: [{ table: 'fa', sourceKey: 'k1', fields: { result: 'NG' } }],
      checkScores: { existing: new Map(), incoming: new Map() },
    })
    expect(result.inserts).toHaveLength(0)
    expect(result.diffs.some((d) => d.kind === 'diff' && d.field === 'result')).toBe(true)
  })

  it('墓碑跳过新增', () => {
    const result = applySync({
      grids: { fa: [], fqcNg: [], fqc: [], cmp: [], perf: [] },
      tombstones: new Set(['fa\u0001k1']),
      shareRows: [{ table: 'fa', sourceKey: 'k1', fields: { date: 'd' } }],
      checkScores: { existing: new Map(), incoming: new Map() },
    })
    expect(result.inserts).toHaveLength(0)
    expect(result.tombstoneSkipCount).toBe(1)
  })

  it('点检分数不同则更新并记 diff', () => {
    const key = checkScoreMapKey('注塑', '1')
    const result = applySync({
      grids: { fa: [], fqcNg: [], fqc: [], cmp: [], perf: [] },
      tombstones: new Set(),
      shareRows: [],
      checkScores: {
        existing: new Map([[key, 90]]),
        incoming: new Map([[key, 88]]),
      },
    })
    expect(result.checkScoreUpdates).toHaveLength(1)
    expect(result.diffs.some((d) => d.tableName === 'checkScores')).toBe(true)
  })
})