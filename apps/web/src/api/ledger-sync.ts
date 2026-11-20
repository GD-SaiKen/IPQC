import { request } from '@/utils/request'
import type { LedgerSnapshot } from '@/domain/ipqc/merge-snapshot'
import type { CheckScores } from '@/domain/ipqc/types'

const BASE = '/ledger-sync'

export interface LedgerShareItem {
  id: string
  name: string
  status: string
}

export interface LedgerPreviewFile {
  role: string
  label: string
  path: string
  modifiedAt?: string
}

export function listShareDirectories(
  shareId: string,
  path = '',
): Promise<{ list: Array<{ name: string; path: string }> }> {
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
  rootPath?: string
}): Promise<{ files: LedgerPreviewFile[]; counts: Record<string, number> }> {
  return request.post(`${BASE}/preview`, body, {
    requestOptions: { showSuccess: false, sessionExpiredOn401: false },
  })
}

export function syncLedger(body: {
  shareId: string
  rootPath?: string
}): Promise<{
  counts: Record<string, number>
  snapshot: LedgerSnapshot
  checkScores?: CheckScores
}> {
  return request.post(`${BASE}`, body, {
    requestOptions: { sessionExpiredOn401: false },
  })
}