import { request } from '@/utils/request'
import type { LedgerSnapshot } from '@/domain/ipqc/merge-snapshot'
import type { CheckScores } from '@/domain/ipqc/types'

const BASE = '/ledger-sync'

export interface LedgerShareItem {
  id: string
  name: string
  status: string
}

export interface LedgerShareEntry {
  name: string
  path: string
  kind: 'directory' | 'file'
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

export interface PreviewSummary {
  total: number
  parsed: number
  unparsed: number
  unsupported: number
  excluded: number
  problem: number
}

export function listShareDirectories(
  shareId: string,
  path = '',
): Promise<{ list: LedgerShareEntry[] }> {
  return request.get(`${BASE}/shares/${encodeURIComponent(shareId)}/entries`, {
    params: { path },
    requestOptions: { sessionExpiredOn401: false },
  })
}

export function listLedgerShares(): Promise<{
  list: LedgerShareItem[]
  total: number
  page: number
  pageSize: number
}> {
  return request.get(`${BASE}/shares`, {
    params: { page: 1, pageSize: 100 },
    requestOptions: { sessionExpiredOn401: false },
  })
}

export function previewLedgerSync(body: {
  shareId: string
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths?: string[]
  rootPaths?: string[]
}): Promise<{
  files: PreviewLedgerFile[]
  summary: PreviewSummary
  issues: PreviewIssue[]
  counts?: Record<string, number>
}> {
  return request.post(`${BASE}/preview`, body, {
    requestOptions: { showSuccess: false, sessionExpiredOn401: false },
  })
}

export function syncLedger(body: {
  shareId: string
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths?: string[]
  previewFiles: Array<{ path: string; modifiedAt?: string }>
  rootPaths?: string[]
}): Promise<{
  files: PreviewLedgerFile[]
  counts: Record<string, number>
  snapshot: LedgerSnapshot
  checkScores?: CheckScores
}> {
  return request.post(`${BASE}`, body, {
    requestOptions: { sessionExpiredOn401: false },
  })
}