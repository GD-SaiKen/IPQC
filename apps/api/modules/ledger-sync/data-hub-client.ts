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

const ENTRIES_PAGE_SIZE = 200

export async function listShareEntries(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<DataHubDirectoryEntry[]> {
  return listShareEntriesPage(
    apiOrigin,
    accessToken,
    shareId,
    path,
    fetchFn,
    1,
    ENTRIES_PAGE_SIZE,
  ).then((result) => result.list)
}

export async function listAllShareEntries(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<DataHubDirectoryEntry[]> {
  const all: DataHubDirectoryEntry[] = []
  let page = 1
  while (true) {
    const { list, total } = await listShareEntriesPage(
      apiOrigin,
      accessToken,
      shareId,
      path,
      fetchFn,
      page,
      ENTRIES_PAGE_SIZE,
    )
    all.push(...list)
    if (list.length < ENTRIES_PAGE_SIZE || page * ENTRIES_PAGE_SIZE >= total) {
      break
    }
    page += 1
  }
  return all
}

async function listShareEntriesPage(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
  page: number,
  pageSize: number,
): Promise<{ list: DataHubDirectoryEntry[]; total: number }> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/entries`, apiOrigin)
  url.searchParams.set('path', path)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  const response = await fetchFn(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new DataHubRequestError(response.status, body)
  }
  const data = parseEnvelope<{ list: DataHubDirectoryEntry[]; total?: number }>(body)
  const list = data.list ?? []
  const total = data.total ?? list.length
  return { list, total }
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

const TABLE_PAGE_SIZE = 100

interface TableManifestResponse {
  path: string
  sheets: Array<{ name: string; totalRows: number; totalColumns: number }>
  warnings?: string[]
}

interface TablePageResponse {
  path: string
  sheet: string
  list: string[][]
  total: number
  page: number
  pageSize: number
}

function dataHubErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'data-hub 请求失败'
  }
  const row = payload as Record<string, unknown>
  if (typeof row.message === 'string' && row.message.trim()) {
    return row.message
  }
  if (typeof row.msg === 'string' && row.msg.trim()) {
    return row.msg
  }
  if ('data' in row) {
    return dataHubErrorMessage(row.data)
  }
  return 'data-hub 请求失败'
}

async function fetchShareTableManifest(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<TableManifestResponse> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/table`, apiOrigin)
  url.searchParams.set('path', path)
  const response = await fetchFn(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new DataHubRequestError(response.status, body)
  }
  return parseEnvelope<TableManifestResponse>(body)
}

async function fetchShareTablePage(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  sheet: string,
  page: number,
  fetchFn: FetchLike,
): Promise<TablePageResponse> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/table`, apiOrigin)
  url.searchParams.set('path', path)
  url.searchParams.set('sheet', sheet)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(TABLE_PAGE_SIZE))
  const response = await fetchFn(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new DataHubRequestError(response.status, body)
  }
  return parseEnvelope<TablePageResponse>(body)
}

async function fetchShareFileModifiedAt(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<string | undefined> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/metadata`, apiOrigin)
  url.searchParams.set('path', path)
  const response = await fetchFn(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    return undefined
  }
  const body = await response.json()
  const data = parseEnvelope<{ modifiedAt?: string | null }>(body)
  return data.modifiedAt ?? undefined
}

/** 通过 data-hub `/table` 投影分页读取，组装与映射层一致的 workbook 结构 */
export async function fetchWorkbook(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<DataHubWorkbook> {
  const [modifiedAt, manifest] = await Promise.all([
    fetchShareFileModifiedAt(apiOrigin, accessToken, shareId, path, fetchFn),
    fetchShareTableManifest(apiOrigin, accessToken, shareId, path, fetchFn),
  ])

  const sheets: DataHubWorkbook['sheets'] = []
  for (const meta of manifest.sheets) {
    const rows: string[][] = []
    if (meta.totalRows > 0) {
      let page = 1
      while (rows.length < meta.totalRows) {
        const chunk = await fetchShareTablePage(
          apiOrigin,
          accessToken,
          shareId,
          path,
          meta.name,
          page,
          fetchFn,
        )
        if (!chunk.list.length) {
          break
        }
        rows.push(...chunk.list)
        if (rows.length >= chunk.total || chunk.list.length < TABLE_PAGE_SIZE) {
          break
        }
        page += 1
      }
    }
    sheets.push({ name: meta.name, rows })
  }

  return {
    path: manifest.path,
    modifiedAt,
    sheets,
  }
}

export class DataHubRequestError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    super(dataHubErrorMessage(payload))
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
    return { status: 400, message: error.message }
  }
  return { status: 500, message: '服务器繁忙，请稍后重试' }
}

export type { DataHubOAuthConfig }