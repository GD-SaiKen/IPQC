import { describe, expect, it, vi } from 'vitest'
import type { LedgerShareEntry } from '@/api/ledger-sync'
import { collectShareFilePaths, filterFilesOutsideDirectory } from '@/views/data/ledger-share-tree'

describe('ledger-share-tree', () => {
  it('collectShareFilePaths 递归收集文件', async () => {
    const list = vi.fn(async (_shareId: string, path: string): Promise<{ list: LedgerShareEntry[] }> => {
      if (path === '台账') {
        return {
          list: [
            { name: '2026', path: '台账/2026', kind: 'directory' },
            { name: 'readme.txt', path: '台账/readme.txt', kind: 'file' },
          ],
        }
      }
      if (path === '台账/2026') {
        return {
          list: [{ name: 'a.xls', path: '台账/2026/a.xls', kind: 'file' }],
        }
      }
      return { list: [] }
    })
    const paths = await collectShareFilePaths('share-1', '台账', list)
    expect(paths.sort()).toEqual(['台账/2026/a.xls', '台账/readme.txt'])
  })

  it('filterFilesOutsideDirectory 去掉目录下的文件', () => {
    expect(
      filterFilesOutsideDirectory(
        ['台账/a.xls', '其他/b.xls', '台账/子/c.xls'],
        '台账',
      ).sort(),
    ).toEqual(['其他/b.xls'])
  })
})