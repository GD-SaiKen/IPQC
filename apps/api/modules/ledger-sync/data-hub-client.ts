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

export interface DataHubWorkbookManifest {
  path: string
  sheets: Array<{ name: string; totalRows: number; totalColumns: number }>
  warnings?: string[]
}

export interface DataHubTablePage {
  path: string
  sheet: string
  list: string[][]
  total: number
  page: number
  pageSize: number
}

export interface DataHubFileMetadata {
  size?: number
  modifiedAt?: string
}

type FetchLike = typeof fetch

const RETRY_DELAYS_MS = [1000, 3000]
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

function parseEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

async function requestDataHub<T>(url: URL, accessToken: string, fetchFn: FetchLike): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchFn(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (response.ok) {
      return parseEnvelope<T>(await response.json())
    }

    const delay = RETRY_DELAYS_MS[attempt]
    if (delay === undefined || !RETRYABLE_STATUSES.has(response.status)) {
      const body: unknown = await response.json().catch(() => undefined)
      throw new DataHubRequestError(response.status, body)
    }

    await response.body?.cancel().catch(() => undefined)
    await new Promise<void>((resolve) => setTimeout(resolve, delay))
  }
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
  const data = await requestDataHub<{ list: DataHubDirectoryEntry[]; total?: number }>(
    url, accessToken, fetchFn,
  )
  const list = data.list ?? []
  const total = data.total ?? list.length
  return { list, total }
}

export async function listShares(
  apiOrigin: string,
  accessToken: string,
  fetchFn: FetchLike,
): Promise<DataHubShare[]> {
  const url = new URL('/api/shares?page=1&pageSize=100', apiOrigin)
  const data = await requestDataHub<{ list: unknown[] }>(url, accessToken, fetchFn)
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
      const data = await requestDataHub<{
        list: Array<{ path: string; fileName?: string; name?: string }>
        total?: number
      }>(url, accessToken, fetchFn)
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

export async function fetchTableManifest(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike = fetch,
): Promise<DataHubWorkbookManifest> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/table`, apiOrigin)
  url.searchParams.set('path', path)
  const manifest = await requestDataHub<DataHubWorkbookManifest>(url, accessToken, fetchFn)
  if (!manifest || typeof manifest.path !== 'string' || !Array.isArray(manifest.sheets)) {
    throw new DataHubRequestError(502, { message: '工作表清单响应不完整' })
  }
  return manifest
}

export async function fetchTablePage(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  sheet: string,
  page: number,
  pageSize = TABLE_PAGE_SIZE,
  fetchFn: FetchLike = fetch,
): Promise<DataHubTablePage> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/table`, apiOrigin)
  url.searchParams.set('path', path)
  url.searchParams.set('sheet', sheet)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  return requestDataHub<DataHubTablePage>(url, accessToken, fetchFn)
}

function isFileSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

const ZONED_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

function isModifiedAt(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const day = ZONED_TIMESTAMP.exec(value)?.[1]
  if (!day) return false

  // Date 会将 2 月 30 日等无效日期滚动到下个月，需核对原始日期。
  const date = new Date(`${day}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day
}

export async function fetchFileMetadata(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike = fetch,
): Promise<DataHubFileMetadata> {
  const url = new URL(`/api/shares/${encodeURIComponent(shareId)}/metadata`, apiOrigin)
  url.searchParams.set('path', path)
  const data = await requestDataHub<{ size?: unknown; modifiedAt?: unknown } | null>(
    url, accessToken, fetchFn,
  )
  const { size, modifiedAt } = data ?? {}
  return {
    size: isFileSize(size) ? size : undefined,
    modifiedAt: isModifiedAt(modifiedAt) ? modifiedAt : undefined,
  }
}

export function getFileMetadataFingerprint({ size, modifiedAt }: DataHubFileMetadata): string | undefined {
  if (!isFileSize(size) || !isModifiedAt(modifiedAt)) return undefined
  return JSON.stringify([size, modifiedAt])
}

function assertFileUnchanged(before: DataHubFileMetadata, after: DataHubFileMetadata): void {
  const sizeChanged = before.size !== undefined && after.size !== undefined
    && before.size !== after.size
  const timeChanged = before.modifiedAt !== undefined && after.modifiedAt !== undefined
    && before.modifiedAt !== after.modifiedAt
  if (sizeChanged || timeChanged) {
    throw new DataHubRequestError(409, { message: '共享盘文件已变化，请重试' })
  }
}

type OnPage = (progress: { sheet: string; page: number; readRows: number }) => void | Promise<void>

async function readSheets(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  manifest: DataHubWorkbookManifest,
  sheetNames: readonly string[],
  fetchFn: FetchLike,
  onPage?: OnPage,
): Promise<DataHubWorkbook['sheets']> {
  const declaredSheets = new Map(manifest.sheets.map((sheet) => [sheet.name, sheet]))

  const sheets: DataHubWorkbook['sheets'] = []
  let readRows = 0
  for (const name of new Set(sheetNames)) {
    const declared = declaredSheets.get(name)
    if (!declared || !Number.isSafeInteger(declared.totalRows) || declared.totalRows < 0) {
      throw new DataHubRequestError(502, { message: `工作表清单缺少有效行数：${name}` })
    }
    const rows: string[][] = []
    for (let page = 1; rows.length < declared.totalRows; page += 1) {
      const chunk = await fetchTablePage(
        apiOrigin, accessToken, shareId, path, name, page, TABLE_PAGE_SIZE, fetchFn,
      )
      const expectedRows = Math.min(TABLE_PAGE_SIZE, declared.totalRows - rows.length)
      if (
        !chunk || chunk.path !== manifest.path || chunk.sheet !== name
        || chunk.page !== page || chunk.pageSize !== TABLE_PAGE_SIZE || chunk.total !== declared.totalRows
        || !Array.isArray(chunk.list) || chunk.list.length !== expectedRows
        || chunk.list.some((row) => !Array.isArray(row))
      ) {
        throw new DataHubRequestError(502, { message: `工作表分页不完整：${name}第${page}页` })
      }
      rows.push(...chunk.list)
      readRows += chunk.list.length
      await onPage?.({ sheet: name, page, readRows })
    }
    sheets.push({ name, rows })
  }
  return sheets
}

/** metadataBefore 在读取工作表清单前取得，分页结束后再次核对。 */
export async function fetchPlannedSheets(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  manifest: DataHubWorkbookManifest,
  sheetNames: readonly string[],
  metadataBefore: DataHubFileMetadata,
  fetchFn: FetchLike = fetch,
  onPage?: OnPage,
): Promise<{
  sheets: DataHubWorkbook['sheets']
  metadata: DataHubFileMetadata
  fingerprint?: string
}> {
  const sheets = await readSheets(
    apiOrigin, accessToken, shareId, path, manifest, sheetNames, fetchFn, onPage,
  )
  const metadata = await fetchFileMetadata(apiOrigin, accessToken, shareId, path, fetchFn)
  assertFileUnchanged(metadataBefore, metadata)
  const before = getFileMetadataFingerprint(metadataBefore)
  const after = getFileMetadataFingerprint(metadata)
  return { sheets, metadata, fingerprint: before === after ? after : undefined }
}

/** 兼容既有全工作簿映射和可选修改时间。 */
export async function fetchWorkbook(
  apiOrigin: string,
  accessToken: string,
  shareId: string,
  path: string,
  fetchFn: FetchLike,
): Promise<DataHubWorkbook> {
  const readOptionalMetadata = () => fetchFileMetadata(apiOrigin, accessToken, shareId, path, fetchFn)
    .catch((error: unknown): DataHubFileMetadata => {
      if (error instanceof DataHubRequestError && error.status !== 401) return {}
      throw error
    })
  const before = await readOptionalMetadata()
  const manifest = await fetchTableManifest(apiOrigin, accessToken, shareId, path, fetchFn)
  const names = manifest.sheets.map((sheet) => sheet.name)
  const sheets = await readSheets(apiOrigin, accessToken, shareId, path, manifest, names, fetchFn)
  if (before.size !== undefined || before.modifiedAt !== undefined) {
    assertFileUnchanged(before, await readOptionalMetadata())
  }
  return {
    path: manifest.path,
    modifiedAt: before.modifiedAt,
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
