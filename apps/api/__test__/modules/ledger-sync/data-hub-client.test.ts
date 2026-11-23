import { describe, expect, it, vi } from 'vitest'

import {
  fetchFileMetadata,
  fetchPlannedSheets,
  fetchTableManifest,
  fetchTablePage,
  fetchWorkbook,
  getFileMetadataFingerprint,
} from '../../../modules/ledger-sync/data-hub-client'

describe('fetchWorkbook', () => {
  it('通过 /table 分页组装 sheets', async () => {
    const calls: string[] = []
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/metadata')) {
        return new Response(JSON.stringify({ data: { modifiedAt: '2026-11-21T00:00:00.000Z' } }), {
          status: 200,
        })
      }
      if (url.includes('/table') && !url.includes('sheet=')) {
        return new Response(
          JSON.stringify({
            data: {
              path: 'a/book.xls',
              sheets: [
                { name: 'S1', totalRows: 2, totalColumns: 2 },
                { name: 'S2', totalRows: 0, totalColumns: 0 },
              ],
            },
          }),
          { status: 200 },
        )
      }
      if (url.includes('sheet=S1')) {
        return new Response(
          JSON.stringify({
            data: {
              path: 'a/book.xls',
              sheet: 'S1',
              list: [
                ['日期', '料号'],
                ['2026-11-20', 'A001'],
              ],
              total: 2,
              page: 1,
              pageSize: 100,
            },
          }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ message: 'unexpected' }), { status: 500 })
    })

    const workbook = await fetchWorkbook(
      'http://hub.test',
      'token',
      'share-1',
      'a/book.xls',
      fetchFn as typeof fetch,
    )

    expect(workbook.modifiedAt).toBe('2026-11-21T00:00:00.000Z')
    expect(workbook.sheets).toHaveLength(2)
    expect(workbook.sheets[0]?.rows).toHaveLength(2)
    expect(workbook.sheets[1]?.rows).toEqual([])
    expect(calls.some((url) => url.includes('/table?') && !url.includes('sheet='))).toBe(true)
    expect(calls.some((url) => url.includes('sheet=S1'))).toBe(true)
  })
})

const request = ['http://hub.test', 'token', 'share-1', 'a/book.xlsx'] as const
const path = request[3]
const metadata = { size: 1024, modifiedAt: '2026-11-21T00:00:00.000Z' }
const manifest = {
  path,
  sheets: [
    { name: '零件清单', totalRows: 55_333, totalColumns: 2 },
    { name: '检验汇总', totalRows: 101, totalColumns: 1 },
  ],
}
const sheet = '检验汇总'

function dataResponse(data: unknown): Response {
  return Response.json({ data })
}

describe('spreadsheet projection', () => {
  it('readsOnlyPlannedSheets', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => [String(index + 1)])
    const requestedPages: string[] = []
    const readCounts: number[] = []
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token')
      const url = new URL(String(input))
      expect(url.searchParams.get('path')).toBe(path)
      if (url.pathname.endsWith('/metadata')) return dataResponse(metadata)
      if (!url.searchParams.has('sheet')) return dataResponse(manifest)
      const name = url.searchParams.get('sheet')
      const page = Number(url.searchParams.get('page'))
      const pageSize = Number(url.searchParams.get('pageSize'))
      if (page === 2) expect(readCounts).toEqual([100])
      requestedPages.push(`${name}/${page}/${pageSize}`)
      return dataResponse({
        path,
        sheet: name,
        list: page === 1 ? firstPage : [['101']],
        total: 101,
        page,
        pageSize,
      })
    })
    const before = await fetchFileMetadata(...request, fetchFn)
    const workbookManifest = await fetchTableManifest(...request, fetchFn)
    const result = await fetchPlannedSheets(
      ...request,
      workbookManifest,
      [sheet],
      before,
      fetchFn,
      async ({ readRows }) => {
        await Promise.resolve()
        readCounts.push(readRows)
      },
    )

    expect(requestedPages).toEqual(['检验汇总/1/100', '检验汇总/2/100'])
    expect(readCounts).toEqual([100, 101])
    expect(result.sheets).toEqual([{ name: sheet, rows: [...firstPage, ['101']] }])
    expect(result.metadata).toEqual(metadata)
    expect(result.fingerprint).toBe('[1024,"2026-11-21T00:00:00.000Z"]')
  })

  it.each([
    { label: 'empty page', list: [], total: 101, page: 2 },
    { label: 'total rows drift', list: [['101']], total: 102, page: 2 },
    { label: 'wrong page number', list: [['101']], total: 101, page: 1 },
    { label: 'oversized page', list: [['101'], ['102']], total: 101, page: 2 },
  ])('rejectsIncompletePages: $label', async (secondPage) => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const page = Number(url.searchParams.get('page'))
      const data = page === 1
        ? { list: Array.from({ length: 100 }, () => ['检验记录']), total: 101, page }
        : { list: secondPage.list, total: secondPage.total, page: secondPage.page }
      return dataResponse({ path, sheet, pageSize: 100, ...data })
    })

    await expect(
      fetchPlannedSheets(...request, manifest, [sheet], metadata, fetchFn),
    ).rejects.toThrow('工作表分页不完整')
  })

  it.each([
    { ...metadata, size: 1025 },
    { ...metadata, modifiedAt: '2026-11-21T01:00:00.000Z' },
  ])('rejectsChangedFile: %j', async (updatedMetadata) => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/metadata')) return dataResponse(updatedMetadata)
      return dataResponse({ path, sheet, list: [['记录']], total: 1, page: 1, pageSize: 100 })
    })
    const singleRowManifest = { path, sheets: [{ name: sheet, totalRows: 1, totalColumns: 1 }] }

    await expect(
      fetchPlannedSheets(...request, singleRowManifest, [sheet], metadata, fetchFn),
    ).rejects.toThrow('共享盘文件已变化')
  })

  it.each([
    { modifiedAt: metadata.modifiedAt },
    { size: 1024 },
    { size: -1, modifiedAt: metadata.modifiedAt },
    { size: 1024, modifiedAt: 'unknown' },
    { size: 1024, modifiedAt: '2026-11-21' },
    { size: 1024, modifiedAt: '2026' },
    { size: 1024, modifiedAt: '0' },
    { size: 1024, modifiedAt: '2026-02-30T00:00:00Z' },
    { size: 1024, modifiedAt: '2026-02-29T00:00:00+08:00' },
    { size: 1024, modifiedAt: '2026-11-21T00:00:00' },
    { size: 1024, modifiedAt: '2026-11-21T00:00Z' },
    { size: 1024, modifiedAt: '2026-11-21T24:00:00Z' },
  ])('does not produce a fingerprint for incomplete metadata: %j', async (data) => {
    const fetchFn = vi.fn(async () => dataResponse(data))
    const before = await fetchFileMetadata(...request, fetchFn)
    const emptyManifest = { path, sheets: [{ name: sheet, totalRows: 0, totalColumns: 1 }] }
    const result = await fetchPlannedSheets(...request, emptyManifest, [sheet], before, fetchFn)

    expect(getFileMetadataFingerprint(data)).toBeUndefined()
    expect(getFileMetadataFingerprint(before)).toBeUndefined()
    expect(result.fingerprint).toBeUndefined()
  })

  it.each([
    '2026-11-21T00:00:00Z',
    '2024-02-29T23:59:59.1234567+08:00',
  ])('preserves a precise zoned modification time %s', async (modifiedAt) => {
    const fetchFn = vi.fn(async () => dataResponse({ size: 1024, modifiedAt }))
    const file = await fetchFileMetadata(...request, fetchFn)

    expect(file.modifiedAt).toBe(modifiedAt)
    expect(getFileMetadataFingerprint(file)).toBe(`[1024,"${modifiedAt}"]`)
  })

  it.each([429, 502, 503, 504])('retries page HTTP %s after one and three seconds', async (status) => {
    vi.useFakeTimers()
    try {
      const fetchFn = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('temporary error', { status }))
        .mockResolvedValueOnce(new Response('temporary error', { status }))
        .mockResolvedValueOnce(dataResponse({ path, sheet, list: [['记录']], total: 1, page: 3, pageSize: 20 }))
      const result = fetchTablePage(...request, sheet, 3, 20, fetchFn)
        .catch((error: unknown) => error)

      await vi.advanceTimersByTimeAsync(999)
      expect(fetchFn).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(fetchFn).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(2999)
      expect(fetchFn).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(1)
      expect(await result).toMatchObject({ page: 3, pageSize: 20, list: [['记录']] })
      expect(fetchFn).toHaveBeenCalledTimes(3)
      expect(new URL(String(fetchFn.mock.calls[0]?.[0])).searchParams.get('pageSize')).toBe('20')
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops retrying after the third response', async () => {
    vi.useFakeTimers()
    try {
      const fetchFn = vi.fn(async () => new Response('unavailable', { status: 503 }))
      const rejection = expect(fetchTableManifest(...request, fetchFn)).rejects.toMatchObject({
        status: 503,
      })
      await vi.advanceTimersByTimeAsync(4000)
      await rejection
      expect(fetchFn).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([400, 401, 404])('does not retry metadata HTTP %s', async (status) => {
    const fetchFn = vi.fn(async () => new Response(null, { status }))

    await expect(fetchFileMetadata(...request, fetchFn)).rejects.toMatchObject({ status })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('stops the workbook authorization chain at the first 401', async () => {
    const fetchFn = vi.fn(async () => Response.json({ message: '授权已失效' }, { status: 401 }))

    await expect(fetchWorkbook(...request, fetchFn)).rejects.toMatchObject({ status: 401 })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
