import { describe, expect, it } from 'vitest'

import {
  applyExclusions,
  dedupeCandidates,
  normalizeLedgerPath,
  validateEntryPath,
} from '../../../modules/ledger-sync/select-files'

describe('select-files', () => {
  it('规范化路径并拒绝非法路径', () => {
    expect(normalizeLedgerPath('a\\b/c')).toBe('a/b/c')
    expect(validateEntryPath('..', 'directory')).not.toBeNull()
    expect(validateEntryPath('D:\\x', 'file')).not.toBeNull()
    expect(validateEntryPath('\\\\server\\x', 'directory')).not.toBeNull()
    expect(validateEntryPath('', 'file')).not.toBeNull()
    expect(validateEntryPath('', 'directory')).toBeNull()
  })

  it('目录递归候选去重', () => {
    const candidates = dedupeCandidates([
      { path: '台账/a.xls', name: 'a.xls' },
      { path: '台账/A.XLS', name: 'A.XLS' },
      { path: '台账/b.pdf', name: 'b.pdf' },
    ])
    expect(candidates).toHaveLength(2)
    expect(candidates.map((item) => item.path)).toContain('台账/a.xls')
  })

  it('排除文件与子目录，单独勾选优先', () => {
    const all = [
      { path: '台账/2026/a.xls', name: 'a.xls' },
      { path: '台账/2026/b.xls', name: 'b.xls' },
      { path: '台账/单独/c.xls', name: 'c.xls' },
    ]
    const result = applyExclusions(all, {
      selectedDirectories: ['台账'],
      pinnedFiles: ['台账/单独/c.xls'],
      excludedPaths: ['台账/2026/b.xls', '台账/2026'],
    })
    expect(result.excluded.map((item) => item.path)).toEqual(
      expect.arrayContaining(['台账/2026/a.xls', '台账/2026/b.xls']),
    )
    expect(result.active.map((item) => item.path)).toEqual(['台账/单独/c.xls'])
  })

  it('范围外的排除路径被忽略', () => {
    const all = [{ path: '台账/a.xls', name: 'a.xls' }]
    const result = applyExclusions(all, {
      selectedDirectories: ['台账'],
      pinnedFiles: [],
      excludedPaths: ['其他目录/x.xls'],
    })
    expect(result.active).toHaveLength(1)
    expect(result.excluded).toHaveLength(0)
  })

})