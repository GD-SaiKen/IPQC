import type { LedgerShareEntry } from '@/api/ledger-sync'
import { isUnderPath } from '@/views/data/ledger-selection'

export type ListShareEntries = (
  shareId: string,
  path: string,
) => Promise<{ list: LedgerShareEntry[] }>

/** 递归列出某目录下的全部文件路径（不含子目录条目） */
export async function collectShareFilePaths(
  shareId: string,
  directoryPath: string,
  listEntries: ListShareEntries,
): Promise<string[]> {
  const files: string[] = []
  const stack = [directoryPath]
  while (stack.length > 0) {
    const current = stack.pop()!
    const { list } = await listEntries(shareId, current)
    for (const item of list) {
      if (item.kind === 'file') {
        files.push(item.path)
      } else {
        stack.push(item.path)
      }
    }
  }
  return files
}

export function filterFilesOutsideDirectory(files: string[], directoryPath: string): string[] {
  return files.filter((path) => !isUnderPath(path, directoryPath))
}