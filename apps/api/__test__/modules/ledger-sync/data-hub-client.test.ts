import { describe, expect, it, vi } from 'vitest'

import { fetchWorkbook } from '../../../modules/ledger-sync/data-hub-client'

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