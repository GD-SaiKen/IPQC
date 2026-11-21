export type PreviewFilter = 'all' | 'parsed' | 'unparsed' | 'problem'

export type HierarchyRowKind = 'directory' | 'file' | 'hint'

export interface HierarchyRow {
  id: string
  name: string
  path: string
  kind: HierarchyRowKind
  rowType?: string
  status?: string
  reason?: string
  label?: string
  modifiedAt?: string
  extension?: string
  children?: HierarchyRow[]
}

export interface SavedLedgerSelection {
  shareId: string
  payload: SyncSelectionPayload
  savedAt: string
}

export interface SyncSelectionPayload {
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths: string[]
}

const selectionByShare = new Map<string, SavedLedgerSelection>()

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

export function basename(path: string): string {
  const segments = normalizePath(path).split('/').filter(Boolean)
  return segments[segments.length - 1] ?? path
}

export function saveLedgerSelection(shareId: string, payload: SyncSelectionPayload): SavedLedgerSelection {
  const record: SavedLedgerSelection = {
    shareId,
    payload: normalizeSyncSelection(payload),
    savedAt: new Date().toISOString(),
  }
  selectionByShare.set(shareId, record)
  return record
}

export function loadLedgerSelection(shareId: string): SavedLedgerSelection | null {
  const raw = selectionByShare.get(shareId)
  if (!raw) {
    return null
  }
  return {
    ...raw,
    payload: normalizeSyncSelection(raw.payload),
  }
}

export function listSavedLedgerSelections(): SavedLedgerSelection[] {
  return [...selectionByShare.values()]
    .map((raw) => ({
      ...raw,
      payload: normalizeSyncSelection(raw.payload),
    }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function latestSavedLedgerSelection(): SavedLedgerSelection | null {
  return listSavedLedgerSelections()[0] ?? null
}

export function clearLedgerSelection(shareId: string): void {
  selectionByShare.delete(shareId)
}

export function isSameSelection(a: SyncSelectionPayload, b: SyncSelectionPayload): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

interface InternalDirNode {
  id: string
  name: string
  path: string
  rowType?: string
  selected?: boolean
  subdirs: Map<string, InternalDirNode>
  leaves: HierarchyRow[]
}

function createInternalDir(path: string, name: string, rowType = '目录'): InternalDirNode {
  return {
    id: `dir:${path || 'root'}`,
    name,
    path: path || '（根）',
    rowType,
    subdirs: new Map(),
    leaves: [],
  }
}

function ensureDirChain(root: InternalDirNode, dirPath: string): InternalDirNode {
  const parts = normalizePath(dirPath).split('/').filter(Boolean)
  if (parts.length === 0) {
    return root
  }
  let current = root
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part
    let next = current.subdirs.get(acc)
    if (!next) {
      next = createInternalDir(acc, part)
      current.subdirs.set(acc, next)
    }
    current = next
  }
  return current
}

function dirChildren(node: InternalDirNode): HierarchyRow[] {
  return [
    ...[...node.subdirs.values()]
      .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
      .map((subdir) => ({
        id: subdir.id,
        name: subdir.name,
        path: subdir.path,
        kind: 'directory' as const,
        rowType: subdir.selected ? '目录·已选' : (subdir.rowType ?? '目录'),
        children: dirChildren(subdir),
      })),
    ...node.leaves.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
  ]
}

function insertExcludedPath(root: InternalDirNode, excludedPath: string): void {
  const normalized = normalizePath(excludedPath)
  if (!normalized) {
    return
  }
  const parts = normalized.split('/').filter(Boolean)
  const parent = ensureDirChain(root, parts.slice(0, -1).join('/'))
  const leafName = basename(normalized)
  const looksLikeDirectory = !/\.[^/]+$/.test(normalized)
  if (looksLikeDirectory) {
    const dirNode = ensureDirChain(root, normalized)
    dirNode.rowType = '排除'
    return
  }
  parent.leaves.push({
    id: `excluded:${normalized}`,
    name: leafName,
    path: normalized,
    kind: 'file',
    rowType: '排除',
    status: 'excluded',
  })
}

function hasFileDescendant(node: InternalDirNode): boolean {
  if (node.leaves.some((leaf) => leaf.kind === 'file')) {
    return true
  }
  return [...node.subdirs.values()].some((child) => hasFileDescendant(child))
}

function hasSelectedSubdir(node: InternalDirNode): boolean {
  return [...node.subdirs.values()].some(
    (child) => child.selected || hasSelectedSubdir(child),
  )
}

function internalTreeFromLeaves(
  leaves: Array<{ path: string; row: Omit<HierarchyRow, 'children'> }>,
): InternalDirNode {
  const root = createInternalDir('', '（共享盘根）')
  for (const item of leaves) {
    const parts = normalizePath(item.path).split('/').filter(Boolean)
    if (parts.length === 0) {
      root.leaves.push({ ...item.row, children: undefined })
      continue
    }
    const parent = ensureDirChain(root, parts.slice(0, -1).join('/'))
    parent.leaves.push({ ...item.row, children: undefined })
  }
  return root
}

export function buildSavedSelectionRows(payload: SyncSelectionPayload): HierarchyRow[] {
  const directories = payload.selectedEntries.filter((item) => item.kind === 'directory')
  const files = payload.selectedEntries.filter((item) => item.kind === 'file')
  const leaves: Array<{ path: string; row: Omit<HierarchyRow, 'children'> }> = []

  for (const file of files) {
    leaves.push({
      path: file.path,
      row: {
        id: `pin:${file.path}`,
        name: basename(file.path),
        path: file.path,
        kind: 'file',
        rowType: '单独勾选',
        status: 'pinned',
      },
    })
  }

  const root = internalTreeFromLeaves(leaves)
  for (const excluded of payload.excludedPaths) {
    insertExcludedPath(root, excluded)
  }
  for (const dir of directories) {
    const node = ensureDirChain(root, dir.path)
    node.selected = true
    if (node.selected && !hasFileDescendant(node) && !hasSelectedSubdir(node)) {
      node.leaves.push({
        id: `hint:${dir.path || 'root'}`,
        name: '核对时递归包含该目录下全部文件',
        path: dir.path || '（根）',
        kind: 'hint',
        rowType: '说明',
      })
    }
  }

  const topDirs = [...root.subdirs.values()]
  const standaloneFiles = root.leaves
  const rows: HierarchyRow[] = [
  ...topDirs
    .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
    .map((subdir) => ({
      id: subdir.id,
      name: subdir.name,
      path: subdir.path,
      kind: 'directory' as const,
      rowType: subdir.selected ? '目录·已选' : '目录',
      children: dirChildren(subdir),
    })),
  ...standaloneFiles,
  ]

  if (directories.some((dir) => !dir.path)) {
    const rootHint = root.leaves.find((leaf) => leaf.kind === 'hint')
    if (rootHint) {
      rows.unshift({
        ...rootHint,
        name: '（共享盘根）',
        path: '（根）',
        children: undefined,
      })
    } else if (!rows.length) {
      rows.push({
        id: 'dir:root',
        name: '（共享盘根）',
        path: '（根）',
        kind: 'directory',
        rowType: '目录·已选',
        children: [
          {
            id: 'hint:root',
            name: '核对时递归包含该目录下全部文件',
            path: '（根）',
            kind: 'hint',
            rowType: '说明',
          },
        ],
      })
    }
  }

  return rows
}

export function buildPreviewHierarchyRows(files: PreviewLedgerFile[]): HierarchyRow[] {
  const leaves = files.map((file) => ({
    path: file.path,
    row: {
      id: file.path,
      name: file.name,
      path: file.path,
      kind: 'file' as const,
      rowType: '文件',
      status: file.status,
      reason: file.reason,
      label: file.label,
      modifiedAt: file.modifiedAt,
      extension: file.extension,
    },
  }))
  const root = internalTreeFromLeaves(leaves)
  const dirRows: HierarchyRow[] = [...root.subdirs.values()]
    .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
    .map((subdir) => ({
      id: subdir.id,
      name: subdir.name,
      path: subdir.path,
      kind: 'directory' as const,
      rowType: '目录',
      children: dirChildren(subdir),
    }))
  return [...dirRows, ...root.leaves]
}

export function isUnderPath(child: string, parent: string): boolean {
  const childPath = normalizePath(child).toLowerCase()
  const parentPath = normalizePath(parent).toLowerCase()
  if (!parentPath) {
    return true
  }
  return childPath === parentPath || childPath.startsWith(`${parentPath}/`)
}

/** 父目录已全选时，去掉其下仍被选中的子目录，避免重复提交 */
export function collapseCheckedDirectories(directories: string[]): string[] {
  const normalized = [...new Set(directories.map((path) => normalizePath(path)))]
  return normalized.filter((dir) =>
    !normalized.some((other) => other !== dir && isUnderPath(dir, other)),
  )
}

/** 落在已选目录下、且不是「排除区内的单独勾选」时，不必写入 files（由目录递归覆盖） */
export function filterRedundantFilesUnderDirectories(
  files: string[],
  directories: string[],
  excludedPaths: string[],
): string[] {
  const collapsed = collapseCheckedDirectories(directories)
  return files.filter((file) => {
    const covering = collapsed.find((dir) => isUnderPath(file, dir))
    if (!covering) {
      return true
    }
    return excludedPaths.some((excluded) => isUnderPath(file, excluded) || file === excluded)
  })
}

export function normalizeSyncSelection(payload: SyncSelectionPayload): SyncSelectionPayload {
  const split = splitSelectionPayload(payload)
  return buildSyncSelection({
    directories: split.directories,
    files: split.files,
    excludedPaths: split.excludedPaths,
  })
}

export function splitSelectionPayload(payload: SyncSelectionPayload): {
  directories: string[]
  files: string[]
  excludedPaths: string[]
} {
  return {
    directories: payload.selectedEntries.filter((item) => item.kind === 'directory').map((item) => item.path),
    files: payload.selectedEntries.filter((item) => item.kind === 'file').map((item) => item.path),
    excludedPaths: [...payload.excludedPaths],
  }
}

export function buildSyncSelection(input: {
  directories: string[]
  files: string[]
  excludedPaths: string[]
}): SyncSelectionPayload {
  const directories = collapseCheckedDirectories(input.directories)
  const files = [...new Set(input.files.map(normalizePath))]
  const selectedEntries = [
    ...directories.map((path) => ({ path, kind: 'directory' as const })),
    ...files.map((path) => ({ path, kind: 'file' as const })),
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