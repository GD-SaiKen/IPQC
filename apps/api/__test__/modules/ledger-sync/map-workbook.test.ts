import { describe, expect, it } from 'vitest'

import type { LedgerRole } from '../../../modules/ledger-sync/ledger-roles'
import { LEDGER_ROLE_LABELS } from '../../../modules/ledger-sync/ledger-roles'
import type { MatchedFile } from '../../../modules/ledger-sync/match-files'
import { mapWorkbooksToSnapshot } from '../../../modules/ledger-sync/map-workbook'

function file(role: LedgerRole, name: string): MatchedFile {
  return { role, path: `/${name}`, name }
}

describe('mapWorkbooksToSnapshot', () => {
  it('S/X 每行一条，不再按检验员合并', () => {
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
    expect(result.snapshot.fa).toHaveLength(2)
    expect(result.snapshot.fa.some((r) => r.result === 'NG')).toBe(true)
    expect(result.snapshot.fa.some((r) => r.result === 'OK')).toBe(true)
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

  it('缺列只失败该文件，其它绑定仍进入快照', () => {
    const wb = new Map<LedgerRole, { path: string; sheets: { name: string; rows: string[][] }[] }>([
      [
        'checkRank',
        {
          path: '/各车间点检评分排名.xlsx',
          sheets: [{ name: 'Sheet1', rows: [['项目'], ['外观']] }],
        },
      ],
      [
        'complaint',
        {
          path: '/投诉.xls',
          sheets: [
            {
              name: 'Sheet1',
              rows: [
                ['日期', '来源', '责任部门'],
                ['2026-01-01', 'BC', '注塑'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [
      file('checkRank', '各车间点检评分排名.xlsx'),
      file('complaint', '投诉.xls'),
    ]
    const result = mapWorkbooksToSnapshot(files, wb, [])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.failures).toEqual([
      expect.objectContaining({
        path: '/各车间点检评分排名.xlsx',
        message: expect.stringContaining('缺少列'),
      }),
    ])
    expect(result.snapshot.cmp.length).toBeGreaterThan(0)
  })

  it('投诉 CSV 单表可映射', () => {
    const wb = new Map([
      [
        'complaint',
        {
          path: '/2026年前制程零件投诉跟进.csv',
          sheets: [
            {
              name: 'csv',
              rows: [
                ['日期', '来源', '责任部门'],
                ['2026-01-01', 'BC', '注塑'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [file('complaint', '2026年前制程零件投诉跟进.csv')]
    const result = mapWorkbooksToSnapshot(files, wb, ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.cmp.length).toBeGreaterThan(0)
  })

  it('毛边首件缺失不向 fa 写入占位', () => {
    const result = mapWorkbooksToSnapshot([], new Map(), ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa).toEqual([])
    void LEDGER_ROLE_LABELS
  })
})