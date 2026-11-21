import { describe, expect, it } from 'vitest'

import {
  buildSyncSelection,
  canConfirmSync,
  canPreviewSelection,
  directoryFullyExcluded,
  filterPreviewFiles,
  isUnderPath,
} from '@/views/data/ledger-selection'

describe('ledger-selection', () => {
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
  })
})