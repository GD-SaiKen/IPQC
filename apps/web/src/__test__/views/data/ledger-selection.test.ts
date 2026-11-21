import { describe, expect, it } from 'vitest'

import {
  buildPreviewHierarchyRows,
  buildSavedSelectionRows,
  buildSyncSelection,
  canConfirmSync,
  canPreviewSelection,
  directoryFullyExcluded,
  filterPreviewFiles,
  isSameSelection,
  isUnderPath,
  latestSavedLedgerSelection,
  listSavedLedgerSelections,
  loadLedgerSelection,
  saveLedgerSelection,
  collapseCheckedDirectories,
  splitSelectionPayload,
} from '@/views/data/ledger-selection'

describe('ledger-selection', () => {
  it('父子联动时父目录全选应折叠子目录', () => {
    expect(
      collapseCheckedDirectories([
        '前制程QC',
        '前制程QC/零件检验汇总',
        '前制程QC/零件检验汇总/首（巡）检验报告/五金',
      ]),
    ).toEqual(['前制程QC'])

    const payload = buildSyncSelection({
      directories: [
        '前制程QC/零件检验汇总/首（巡）检验报告/五金',
        '前制程QC/零件检验汇总/首（巡）检验报告/压铸',
        '前制程QC/零件检验汇总/首（巡）检验汇总记录',
      ],
      files: ['前制程QC/零件检验汇总/首（巡）检验报告/Thumbs.db'],
      excludedPaths: [],
    })
    expect(payload.selectedEntries.map((item) => item.path).sort()).toEqual([
      '前制程QC/零件检验汇总/首（巡）检验报告/Thumbs.db',
      '前制程QC/零件检验汇总/首（巡）检验报告/五金',
      '前制程QC/零件检验汇总/首（巡）检验报告/压铸',
      '前制程QC/零件检验汇总/首（巡）检验汇总记录',
    ])
  })

  it('拆分保存负载可还原树状态字段', () => {
    const payload = buildSyncSelection({
      directories: ['台账/2026'],
      files: ['台账/单独/a.xls'],
      excludedPaths: ['台账/2026/b.xls'],
    })
    expect(splitSelectionPayload(payload)).toEqual({
      directories: ['台账/2026'],
      files: ['台账/单独/a.xls'],
      excludedPaths: ['台账/2026/b.xls'],
    })
  })

  it('无选择时不能核对', () => {
    const payload = buildSyncSelection({ directories: [], files: [], excludedPaths: [] })
    expect(canPreviewSelection(payload)).toBe(false)
  })

  it('排除子目录后仍可单独勾选文件', () => {
    expect(
      isUnderPath('台账/单独/a.xls', '台账/单独'),
    ).toBe(true)
    const payload = buildSyncSelection({
      directories: ['台账'],
      files: ['台账/单独/a.xls'],
      excludedPaths: ['台账/2026'],
    })
    expect(payload.selectedEntries).toHaveLength(2)
    expect(payload.excludedPaths).toContain('台账/2026')
  })

  it('目录下文件全部被排除且没有单文件时视为未选', () => {
    expect(
      directoryFullyExcluded('台账', ['台账/2026/a.xls'], []),
    ).toBe(true)
    expect(
      directoryFullyExcluded('台账', ['台账/2026/a.xls'], ['台账/单独/c.xls']),
    ).toBe(false)
  })

  it('保存选择后生成多层级列表', () => {
    const payload = buildSyncSelection({
      directories: ['台账'],
      files: ['台账/单独/a.xls'],
      excludedPaths: ['台账/2026/b.xls'],
    })
    saveLedgerSelection('share-1', payload)
    const loaded = loadLedgerSelection('share-1')
    expect(loaded?.payload).toEqual(payload)
    expect(listSavedLedgerSelections()).toHaveLength(1)
    expect(latestSavedLedgerSelection()?.shareId).toBe('share-1')
    expect(isSameSelection(payload, payload)).toBe(true)

    const rows = buildSavedSelectionRows(payload)
    expect(rows).toHaveLength(1)
    const findByPath = (items: ReturnType<typeof buildSavedSelectionRows>, target: string): boolean => {
      for (const item of items) {
        if (item.path === target) {
          return true
        }
        if (item.children?.length && findByPath(item.children, target)) {
          return true
        }
      }
      return false
    }
    expect(findByPath(rows, '台账/2026/b.xls')).toBe(true)
    expect(findByPath(rows, '台账/单独/a.xls')).toBe(true)
    expect(findByPath(rows, '台账/2026')).toBe(true)

    const nestedPayload = buildSyncSelection({
      directories: ['台账/2026'],
      files: [],
      excludedPaths: ['台账/2026/旧档/a.xls'],
    })
    const nestedRows = buildSavedSelectionRows(nestedPayload)
    expect(nestedRows[0]?.name).toBe('台账')
    expect(nestedRows[0]?.children?.some((child) => child.name === '2026')).toBe(true)
    const year2026 = nestedRows[0]?.children?.find((child) => child.name === '2026')
    expect(year2026?.children?.some((child) => child.name === '旧档')).toBe(true)

    const previewRows = buildPreviewHierarchyRows([
      {
        path: '台账/2026/a.xls',
        name: 'a.xls',
        extension: 'xls',
        status: 'parsed',
      },
      {
        path: '台账/2025/b.pdf',
        name: 'b.pdf',
        extension: 'pdf',
        status: 'unsupported',
      },
    ])
    expect(previewRows).toHaveLength(1)
    expect(previewRows[0]?.children?.map((child) => child.name)).toEqual(['2025', '2026'])
  })

  it('筛选视图与确认阻止条件', () => {
    const files = [
      { path: 'a', name: 'a', extension: 'xls', status: 'parsed' },
      { path: 'b', name: 'b', extension: 'pdf', status: 'unsupported' },
      { path: 'c', name: 'c', extension: 'xls', status: 'duplicate' },
    ]
    expect(filterPreviewFiles(files, 'unparsed')).toHaveLength(1)
    expect(filterPreviewFiles(files, 'problem')).toHaveLength(1)
    expect(canConfirmSync([{ type: 'duplicate', message: '重复' }], files)).toBe(false)
    expect(canConfirmSync([], [{ path: 'a', name: 'a', extension: 'xls', status: 'parsed' }])).toBe(true)
    expect(
      canConfirmSync(
        [{ type: 'missing_role', message: '未包含注塑首件' }],
        [{ path: 'a', name: 'a', extension: 'xls', status: 'parsed' }],
      ),
    ).toBe(true)
    expect(
      canConfirmSync(
        [{ type: 'read_failed', message: '读取失败' }],
        [
          { path: 'a', name: 'a', extension: 'xls', status: 'parsed' },
          { path: 'b', name: 'b', extension: 'xls', status: 'invalid' },
        ],
      ),
    ).toBe(true)
    expect(canConfirmSync([], [])).toBe(false)
  })
})