import { describe, expect, it } from 'vitest'

import { isIpqcDb } from '@/db/ipqc-store'
import { mergeCheckScores, mergeLedgerSnapshot } from '@/domain/ipqc/merge-snapshot'
import type { IpqcDb } from '@/domain/ipqc/types'

function sampleDb(): IpqcDb {
  return {
    fa: [],
    fqc: [],
    fqcNg: [],
    cmp: [],
    perf: [],
    mat: [{ id: 1 }],
    trn: [{ id: 't1' }],
    exam: [{ id: 'e1' }],
    skill: [{ id: 's1' }],
  } as unknown as IpqcDb
}

describe('mergeLedgerSnapshot', () => {
  it('替换源表并保留培训三张表', () => {
    const current = sampleDb()
    const next = mergeLedgerSnapshot(current, {
      fa: [{ date: '2026-01-01' } as IpqcDb['fa'][number]],
      fqc: [{ d: 'x' }],
      fqcNg: [{ ws: '注塑' }],
      cmp: [],
      perf: [],
      mat: [],
      trn: [],
      exam: [],
      skill: [],
    })
    expect(next.fa).toHaveLength(1)
    expect(next.trn).toEqual(current.trn)
    expect(next.mat).toEqual(current.mat)
    expect(isIpqcDb(next)).toBe(true)
  })
})

describe('mergeCheckScores', () => {
  it('合并点检得分', () => {
    const merged = mergeCheckScores({ 注塑: { '1': 8 } }, { 注塑: { '2': 9 }, 五金: { '1': 7 } })
    expect(merged.注塑?.['2']).toBe(9)
    expect(merged.五金?.['1']).toBe(7)
  })
})