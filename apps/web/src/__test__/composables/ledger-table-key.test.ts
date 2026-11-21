import { describe, expect, it } from 'vitest'

import { diffLinkTarget, ledgerApiTableFromId } from '@/composables/ledger-table-key'

describe('ledger-table-key', () => {
  it('tableId 映射 API 表名', () => {
    expect(ledgerApiTableFromId('fqc-ng')).toBe('fqcNg')
    expect(ledgerApiTableFromId('trn-exam')).toBe('exam')
  })

  it('差异链接遵循规格路径', () => {
    expect(diffLinkTarget('fa', 'uuid-1')).toEqual({ path: '/fa', query: { rowId: 'uuid-1' } })
    expect(diffLinkTarget('checkScores', null, '注塑', '3')).toEqual({
      path: '/chk',
      query: { workshop: '注塑', month: '3' },
    })
    expect(diffLinkTarget('unknown', 'x')).toBeNull()
    expect(diffLinkTarget('fa', null, null, null)).toBeNull()
  })
})