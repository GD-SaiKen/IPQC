import { request } from '@/utils/request'
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

export interface LedgerSelectionScope {
  expandedTotal: number
  activeTotal: number
  excludedTotal: number
  selectedDirectoryCount: number
  selectedFileCount: number
  excludedPathCount: number
}

export function countLedgerScope(body: {
  shareId: string
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths?: string[]
}): Promise<LedgerSelectionScope> {
  return request.post(`${BASE}/scope`, body, {
    requestOptions: { showSuccess: false, sessionExpiredOn401: false },
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

export interface LedgerSyncConfig {
  shareId: string | null
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths: string[]
  hour: number
  minute: number
  configVersion: number
  savedByUserId: string | null
  dataHubLinked: boolean
  updatedAt: string | null
}

export function fetchSyncConfig(): Promise<LedgerSyncConfig> {
  return request.get(`${BASE}/config`, {
    requestOptions: { sessionExpiredOn401: false },
  })
}

export function putSyncConfig(body: {
  shareId?: string | null
  selectedEntries: Array<{ path: string; kind: 'directory' | 'file' }>
  excludedPaths: string[]
  hour: number
  minute: number
}): Promise<LedgerSyncConfig & { updatedAt: string }> {
  return request.put(`${BASE}/config`, body, {
    requestOptions: { sessionExpiredOn401: false },
  })
}

export interface LedgerSyncRunResult {
  id: string
  status: string
  addedCount: number
  skippedCount: number
  diffCount: number
  unmatchedCount: number
  tombstoneSkipCount: number
  diffs: Array<{
    tableName: string
    rowId?: string
    field: string
    shareValue: string
    gridValue: string
    kind: string
    workshop?: string
    month?: string
  }>
}

export function runLedgerSync(body: {
  previewFiles?: Array<{ path: string; modifiedAt?: string }>
}): Promise<LedgerSyncRunResult> {
  return request.post(`${BASE}/run`, body, {
    requestOptions: { sessionExpiredOn401: false },
  })
}