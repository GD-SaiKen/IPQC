import { describe, expect, it } from 'vitest'

import type { LedgerRole } from '../../../modules/ledger-sync/ledger-roles'
import { LEDGER_ROLE_LABELS } from '../../../modules/ledger-sync/ledger-roles'
import type { MatchedFile } from '../../../modules/ledger-sync/match-files'
import { mapWorkbooksToSnapshot } from '../../../modules/ledger-sync/map-workbook'

function file(role: LedgerRole, name: string): MatchedFile {
  return { role, path: `/${name}`, name }
}

describe('mapWorkbooksToSnapshot', () => {
  it('S/X 归并为同一批次', () => {
    const wb = new Map([
      [
        'faInjection',
        {
          path: '/注塑首巡检.xlsx',
          sheets: [
            {
              name: 'Sheet1',
              rows: [
                ['日期', '类型', '结果', '检验员'],
                ['2026-01-02', 'S', 'OK', '张三'],
                ['2026-01-02', 'X', 'NG', '张三'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [file('faInjection', '注塑首巡检.xlsx')]
    const result = mapWorkbooksToSnapshot(files, wb, ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa).toHaveLength(1)
    expect(result.snapshot.fa[0]?.result).toBe('NG')
  })

  it('印刷表区分首件与终检', () => {
    const wb = new Map([
      [
        'printLedger',
        {
          path: '/2026年印刷车间品质履历表.xlsx',
          sheets: [
            {
              name: '首件',
              rows: [
                ['日期', '类型', '结果', '检验员'],
                ['2026-01-01', 'S', 'OK', '李四'],
              ],
            },
            {
              name: 'FQC',
              rows: [
                ['日期', '批次', '品号'],
                ['2026-01-01', 'B1', 'P1'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [file('printLedger', '2026年印刷车间品质履历表.xlsx')]
    const result = mapWorkbooksToSnapshot(files, wb, ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa.length).toBeGreaterThan(0)
    expect(result.snapshot.fqcNg.length).toBeGreaterThan(0)
  })

  it('缺列时整份失败', () => {
    const wb = new Map([
      [
        'complaint',
        {
          path: '/2026年前制程零件投诉跟进.xls',
          sheets: [{ name: 'Sheet1', rows: [['来源'], ['BC']] }],
        },
      ],
    ])
    const files = [file('complaint', '2026年前制程零件投诉跟进.xls')]
    const result = mapWorkbooksToSnapshot(files, wb, [])
    expect(result).toEqual({ kind: 'reject', message: expect.stringContaining('缺少列') })
  })

  it('毛边首件缺失不向 fa 写入占位', () => {
    const result = mapWorkbooksToSnapshot([], new Map(), ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa).toEqual([])
    void LEDGER_ROLE_LABELS
  })
})