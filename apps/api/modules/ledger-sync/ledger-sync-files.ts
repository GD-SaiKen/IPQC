import { LEDGER_ROLE_LABELS, type LedgerRole } from './ledger-roles'
import {
  analyzeSelectedLedgerFiles,
  isSupportedSpreadsheet,
  spreadsheetExtension,
  type SearchHit,
} from './match-files'
import type { FileCandidate } from './select-files'

export type LedgerFileStatus =
  | 'parsed'
  | 'unrecognized'
  | 'unsupported'
  | 'excluded'
  | 'duplicate'
  | 'invalid'

export interface LedgerFileRecord {
  path: string
  name: string
  extension: string
  role?: string
  label?: string
  modifiedAt?: string
  status: LedgerFileStatus
  reason?: string
}

export type LedgerIssueType =
  | 'missing_role'
  | 'duplicate'
  | 'invalid'
  | 'column_mismatch'
  | 'read_failed'

export interface LedgerIssue {
  type: LedgerIssueType
  message: string
  role?: string
  paths?: string[]
}

export function basename(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? path
}

export function buildLedgerFileRecords(input: {
  excluded: FileCandidate[]
  active: FileCandidate[]
}): {
  files: LedgerFileRecord[]
  parseHits: SearchHit[]
  analysis: ReturnType<typeof analyzeSelectedLedgerFiles>
  issues: LedgerIssue[]
} {
  const files: LedgerFileRecord[] = []
  const issues: LedgerIssue[] = []

  for (const item of input.excluded) {
    files.push({
      path: item.path,
      name: item.name,
      extension: spreadsheetExtension(item.name),
      status: 'excluded',
      reason: '用户已排除',
    })
  }

  const activeUnsupported: FileCandidate[] = []
  const activeSupported: FileCandidate[] = []
  for (const item of input.active) {
    if (isSupportedSpreadsheet(item.name)) {
      activeSupported.push(item)
      continue
    }
    activeUnsupported.push(item)
  }

  for (const item of activeUnsupported) {
    files.push({
      path: item.path,
      name: item.name,
      extension: spreadsheetExtension(item.name) || basename(item.name),
      status: 'unsupported',
      reason: `不支持的扩展名：${spreadsheetExtension(item.name) || basename(item.name)}`,
    })
  }

  const parseHits = activeSupported.map((item) => ({
    path: item.path,
    name: item.name,
  }))
  const analysis = analyzeSelectedLedgerFiles(parseHits)

  for (const item of analysis.unrecognized) {
    files.push({
      path: item.path,
      name: item.name,
      extension: spreadsheetExtension(item.name),
      status: 'unrecognized',
      reason: '文件名未对应台账角色',
    })
  }

  for (const item of analysis.invalid) {
    files.push({
      path: item.hit.path,
      name: item.hit.name,
      extension: spreadsheetExtension(item.hit.name),
      status: 'invalid',
      reason: item.reason,
    })
    issues.push({
      type: 'invalid',
      message: item.reason,
      paths: [item.hit.path],
    })
  }

  for (const duplicate of analysis.duplicates) {
    for (const path of duplicate.paths) {
      const name = parseHits.find((hit) => hit.path === path)?.name ?? basename(path)
      files.push({
        path,
        name,
        extension: spreadsheetExtension(name),
        role: duplicate.role,
        label: LEDGER_ROLE_LABELS[duplicate.role],
        status: 'duplicate',
        reason: '同一角色存在多个文件',
      })
    }
    issues.push({
      type: 'duplicate',
      role: duplicate.role,
      message: `${LEDGER_ROLE_LABELS[duplicate.role]} 存在多条匹配文件`,
      paths: duplicate.paths,
    })
  }

  for (const role of analysis.missingRoles) {
    issues.push({
      type: 'missing_role',
      role,
      message: `缺少必需台账：${LEDGER_ROLE_LABELS[role]}`,
    })
  }

  const duplicatePaths = new Set(analysis.duplicates.flatMap((item) => item.paths))
  for (const item of analysis.files) {
    if (duplicatePaths.has(item.path)) {
      continue
    }
    files.push({
      path: item.path,
      name: item.name,
      extension: spreadsheetExtension(item.name),
      role: item.role,
      label: LEDGER_ROLE_LABELS[item.role],
      status: 'parsed',
    })
  }

  files.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
  return { files, parseHits, analysis, issues }
}

export function markParsedFiles(
  files: LedgerFileRecord[],
  parsed: Array<{ role: LedgerRole; path: string; modifiedAt?: string }>,
  readFailures: Array<{ path: string; reason: string }>,
  columnFailures: Array<{ path: string; message: string }>,
): { files: LedgerFileRecord[]; issues: LedgerIssue[] } {
  const issues: LedgerIssue[] = []
  const parsedByPath = new Map(parsed.map((item) => [item.path, item]))
  const next = files.map((file) => ({ ...file }))

  for (const failure of readFailures) {
    const index = next.findIndex((file) => file.path === failure.path)
    if (index < 0) {
      continue
    }
    next[index] = {
      ...next[index]!,
      status: failure.reason.includes('尚未提供 CSV') ? 'unsupported' : 'invalid',
      reason: failure.reason,
    }
    if (failure.reason.includes('尚未提供 CSV')) {
      continue
    }
    issues.push({
      type: 'read_failed',
      message: failure.reason,
      paths: [failure.path],
    })
  }

  for (const failure of columnFailures) {
    const target = next.find((file) => file.path === failure.path)
    if (!target) {
      continue
    }
    target.status = 'invalid'
    target.reason = failure.message
    issues.push({
      type: 'column_mismatch',
      message: failure.message,
      paths: [failure.path],
    })
  }

  for (const item of parsed) {
    const target = next.find((file) => file.path === item.path)
    if (!target) {
      continue
    }
    target.status = 'parsed'
    target.role = item.role
    target.label = LEDGER_ROLE_LABELS[item.role]
    target.modifiedAt = item.modifiedAt
    target.reason = undefined
  }

  return { files: next, issues }
}

export function summarizeLedgerFiles(files: LedgerFileRecord[], issues: LedgerIssue[]): {
  total: number
  parsed: number
  unparsed: number
  unsupported: number
  excluded: number
  problem: number
} {
  const excluded = files.filter((file) => file.status === 'excluded').length
  const parsed = files.filter((file) => file.status === 'parsed').length
  const unsupported = files.filter((file) => file.status === 'unsupported').length
  const unrecognized = files.filter((file) => file.status === 'unrecognized').length
  const fileProblems = files.filter((file) => file.status === 'duplicate' || file.status === 'invalid').length
  const missingProblems = issues.filter((issue) => issue.type === 'missing_role').length
  return {
    total: files.length,
    parsed,
    unparsed: unrecognized + unsupported,
    unsupported,
    excluded,
    problem: fileProblems + missingProblems,
  }
}

export function hasBlockingIssues(issues: LedgerIssue[]): boolean {
  return issues.some((issue) =>
  ['missing_role', 'duplicate', 'invalid', 'column_mismatch', 'read_failed'].includes(issue.type),
  )
}

export function comparePreviewFiles(
  previewFiles: Array<{ path: string; modifiedAt?: string }> | undefined,
  current: Array<{ path: string; modifiedAt?: string }>,
): boolean {
  if (!previewFiles?.length) {
    return false
  }
  const normalizeKey = (path: string) => path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()
  const previous = new Map(
    previewFiles.map((item) => [normalizeKey(item.path), item.modifiedAt ?? '']),
  )
  const latest = new Map(current.map((item) => [normalizeKey(item.path), item.modifiedAt ?? '']))
  if (previous.size !== latest.size) {
    return false
  }
  for (const [path, modifiedAt] of previous) {
    if (!latest.has(path)) {
      return false
    }
    const prevModified = modifiedAt
    const latestModified = latest.get(path) ?? ''
    if (prevModified && latestModified && prevModified !== latestModified) {
      return false
    }
  }
  return true
}