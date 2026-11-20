import type { DataHubOAuthConfig } from '../auth/data-hub-config'

export interface DataHubShare {
  id: string
  name: string
  status: string
}

export interface DataHubDirectoryEntry {
  name: string
  path: string
  kind: 'file' | 'directory'
}

export interface DataHubSearchHit {
  path: string
  name: string
  shareId?: string
}

export interface DataHubWorkbook {
  path: string
  modifiedAt?: string
  sheets: Array<{ name: string; rows: string[][]; formulaWithoutCache?: boolean }>
}

type FetchLike = typeof fetch

function parseEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

/** data-hub 列表项为 displayName / connectionStatus，规格层统一为 name / status */
export function normalizeShare(raw: unknown): DataHubShare {
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  const name =
    typeof row.displayName === 'string'
      ? row.displayName
      : typeof row.name === 'string'
        ? row.name
        : ''
  const status =
    typeof row.connectionStatus === 'string'
      ? row.connectionStatus
      : typeof row.status === 'string'
        ? row.status
        : ''
  return { id, name, status }
}

export async function listShareEntries(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<DataHubDirectoryEntry[]> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/entries`, apiOrigin)
  url.searchParams.set('path', path)
  url.searchParams.set('page', '1')
  url.searchParams.set('pageSize', '200')
  const response = await fetchFn(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new DataHubRequestError(response.status, body)
  }
  const data = parseEnvelope<{ list: DataHubDirectoryEntry[] }>(body)
  return data.list ?? []
}

export async function listShares(
  apiOrigin: string,
  accessToken: string,
  fetchFn: FetchLike,
): Promise<DataHubShare[]> {
  const response = await fetchFn(new URL('/api/shares?page=1&pageSize=100', apiOrigin), {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new DataHubRequestError(response.status, body)
  }
  const data = parseEnvelope<{ list: unknown[] }>(body)
  return (data.list ?? []).map(normalizeShare).filter((item) => item.id.length > 0)
}

const SEARCH_QUERIES = [
  '100394-003',
  '首巡检报告',
  '首巡检',
  '品质履历表',
  '品质履历',
  '不良品清查',
  '零件投诉',
  '点检评分',
  '关键点管控',
  'PQC员工',
  '绩效',
]

const SEARCH_PAGE_SIZE = 100
const SEARCH_MAX_PAGES = 25

function fileNameOf(row: { path: string; fileName?: string; name?: string }): string {
  if (row.fileName?.trim()) {
    return row.fileName.trim()
  }
  if (row.name?.trim()) {
    return row.name.trim()
  }
  const segments = row.path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? row.path
}

export async function searchLedgerPaths(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  pathPrefix: string,
  fetchFn: FetchLike,
): Promise<DataHubSearchHit[]> {
  const seen = new Set<string>()
  const hits: DataHubSearchHit[] = []
  for (const q of SEARCH_QUERIES) {
    let page = 1
    while (page <= SEARCH_MAX_PAGES) {
      const url = new URL('/api/search/files', apiOrigin)
      url.searchParams.set('q', q)
      url.searchParams.set('shareIds', shareId)
      url.searchParams.set('pathPrefix', pathPrefix)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(SEARCH_PAGE_SIZE))
      const response = await fetchFn(url, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
      const body = await response.json()
      if (!response.ok) {
        throw new DataHubRequestError(response.status, body)
      }
      const data = parseEnvelope<{
        list: Array<{ path: string; fileName?: string; name?: string }>
        total?: number
      }>(body)
      const list = data.list ?? []
      for (const row of list) {
        if (seen.has(row.path)) continue
        seen.add(row.path)
        hits.push({
          path: row.path,
          name: fileNameOf(row),
        })
      }
      const total = data.total ?? list.length
      if (list.length < SEARCH_PAGE_SIZE || page * SEARCH_PAGE_SIZE >= total) {
        break
      }
      page += 1
    }
  }
  return hits
}

export async function fetchWorkbook(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<DataHubWorkbook> {
  const url = new URL(`/api/shares/${shareId}/workbook`, apiOrigin)
  url.searchParams.set('path', path)
  const response = await fetchFn(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (response.status === 404) {
    throw new DataHubRequestError(404, body)
  }
  if (!response.ok) {
    throw new DataHubRequestError(response.status, body)
  }
  return parseEnvelope<DataHubWorkbook>(body)
}

export class DataHubRequestError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof (payload as { message: string }).message === 'string'
        ? (payload as { message: string }).message
        : 'data-hub 请求失败'
    super(message)
    this.status = status
    this.payload = payload
  }
}

export function mapDataHubError(error: unknown): { status: number; message: string } {
  if (error instanceof DataHubRequestError) {
    if (error.status === 401) {
      return { status: 401, message: 'data-hub 授权已失效，请重新连接' }
    }
    if (error.status === 404) {
      return { status: 404, message: '找不到可用的共享盘' }
    }
    if (error.status === 400 && error.message.includes('表格')) {
      return { status: 400, message: error.message }
    }
    if (error.status === 404 && String(error.message).includes('workbook')) {
      return { status: 400, message: 'data-hub 尚未提供表格读取' }
    }
    return { status: 400, message: error.message }
  }
  return { status: 500, message: '服务器繁忙，请稍后重试' }
}

export type { DataHubOAuthConfig }