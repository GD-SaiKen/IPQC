import { describe, expect, it } from 'vitest'

import { buildSourceKey } from '../../../modules/ledger/source-key'
import { RECORD_SEPARATOR } from '../../../modules/ledger/text-value'

describe('buildSourceKey', () => {
  it('各业务段非空时不含路径', () => {
    const key = buildSourceKey({
      table: 'fa',
      segments: {
        date: '2026-01-02',
        dept: '注塑',
        pn: 'PN1',
        item: '外观',
        stage: '量产',
      },
    })
    expect(key).toBe(['2026-01-02', '注塑', 'PN1', '外观', '量产'].join(RECORD_SEPARATOR))
    expect(key).not.toContain('.xlsx')
  })

  it('料号为空时只追加一次路径、表名和行号', () => {
    const key = buildSourceKey({
      table: 'fa',
      segments: {
        date: '2026-01-02',
        dept: '注塑',
        pn: '',
        item: '外观',
        stage: '量产',
      },
      sourceFile: '品质/首件.xlsx',
      sourceSheet: 'SX',
      sourceRow: 12,
    })
    expect(key?.endsWith(`${RECORD_SEPARATOR}品质/首件.xlsx${RECORD_SEPARATOR}SX${RECORD_SEPARATOR}12`)).toBe(
      true,
    )
  })

  it('路径段大小写规范化', () => {
    const a = buildSourceKey({
      table: 'fa',
      segments: { date: 'd', dept: '注塑', pn: '', item: '', stage: '首件' },
      sourceFile: '品质/A.xlsx',
      sourceSheet: 'S',
      sourceRow: 2,
    })
    const b = buildSourceKey({
      table: 'fa',
      segments: { date: 'd', dept: '注塑', pn: '', item: '', stage: '首件' },
      sourceFile: '品质/a.xlsx',
      sourceSheet: 'S',
      sourceRow: 2,
    })
    expect(a).toBe(b)
  })
})