export type PreviewFilter = 'all' | 'parsed' | 'unparsed' | 'problem'

export interface SyncSelectionPayload {
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths: string[]
}

export interface PreviewLedgerFile {
  path: string
  name: string
  extension: string
  role?: string
  label?: string
  modifiedAt?: string
  status: string
  reason?: string
}

export interface PreviewIssue {
  type: string
  message: string
  role?: string
  paths?: string[]
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

export function isUnderPath(child: string, parent: string): boolean {
  const childPath = normalizePath(child).toLowerCase()
  const parentPath = normalizePath(parent).toLowerCase()
  if (!parentPath) {
    return true
  }
  return childPath === parentPath || childPath.startsWith(`${parentPath}/`)
}

export function buildSyncSelection(input: {
  directories: string[]
  files: string[]
  excludedPaths: string[]
}): SyncSelectionPayload {
  const selectedEntries = [
    ...input.directories.map((path) => ({ path, kind: 'directory' as const })),
    ...input.files.map((path) => ({ path, kind: 'file' as const })),
  ]
  return {
    selectedEntries,
    excludedPaths: [...new Set(input.excludedPaths.map(normalizePath))],
  }
}

export function canPreviewSelection(payload: SyncSelectionPayload): boolean {
  return payload.selectedEntries.length > 0
}

export function directoryHalfChecked(directory: string, excludedPaths: string[], pinnedFiles: string[]): boolean {
  const excludedUnderDir = excludedPaths.some((path) => isUnderPath(path, directory))
  const pinUnderDir = pinnedFiles.some((path) => isUnderPath(path, directory))
  return excludedUnderDir && pinUnderDir
}

export function directoryFullyExcluded(
  directory: string,
  excludedPaths: string[],
  pinnedFiles: string[],
): boolean {
  const hasPinned = pinnedFiles.some((path) => isUnderPath(path, directory))
  if (hasPinned) {
    return false
  }
  return excludedPaths.some((path) => isUnderPath(path, directory))
}

export function filterPreviewFiles(files: PreviewLedgerFile[], filter: PreviewFilter): PreviewLedgerFile[] {
  if (filter === 'all') {
    return files
  }
  if (filter === 'parsed') {
    return files.filter((file) => file.status === 'parsed')
  }
  if (filter === 'unparsed') {
    return files.filter((file) => file.status === 'unrecognized' || file.status === 'unsupported')
  }
  return files.filter((file) => file.status === 'duplicate' || file.status === 'invalid')
}

export function canConfirmSync(issues: PreviewIssue[], files: PreviewLedgerFile[]): boolean {
  if (issues.some((issue) => ['missing_role', 'duplicate', 'invalid', 'column_mismatch', 'read_failed'].includes(issue.type))) {
    return false
  }
  if (files.some((file) => file.status === 'duplicate' || file.status === 'invalid')) {
    return false
  }
  return true
}

export const STATUS_LABELS: Record<string, string> = {
  parsed: '已解析',
  unrecognized: '未识别',
  unsupported: '不支持',
  excluded: '已排除',
  duplicate: '重复',
  invalid: '无效',
}