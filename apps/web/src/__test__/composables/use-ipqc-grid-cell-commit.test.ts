import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  commitGridCell,
  normalizeGridCell,
} from '@/composables/use-ipqc-grid-cell-commit'
import { useEditHistory } from '@/composables/use-edit-history'

const persistLedgerCell = vi.fn()

vi.mock('@/composables/use-ipqc-ledger-save', () => ({
  persistLedgerCell: (...args: unknown[]) => persistLedgerCell(...args),
}))

beforeEach(() => {
  persistLedgerCell.mockReset()
  persistLedgerCell.mockRejectedValue(new Error('network'))
})

describe('use-ipqc-grid-cell-commit', () => {
  it('数字列规范化', () => {
    expect(normalizeGridCell({ key: 'n', label: 'n', type: 'num' }, '3.5')).toBe(3.5)
    expect(normalizeGridCell({ key: 'n', label: 'n', type: 'num' }, '')).toBe('')
  })

  it('无效下拉不提交', async () => {
    const history = useEditHistory('t1')
    const row = { id: '1', kind: 'A' }
    const ok = await commitGridCell({
      row,
      col: { key: 'kind', label: '类型', type: 'select', options: ['A', 'B'] },
      value: 'Z',
      before: 'A',
      apiTable: 'fa',
      history,
    })
    expect(ok).toBe(false)
    expect(history.stack.value.length).toBe(0)
    expect(row.kind).toBe('A')
  })

  it('保存成功入栈', async () => {
    persistLedgerCell.mockResolvedValue(undefined)
    const history = useEditHistory('t1')
    const row = { id: '1', note: 'a' }
    const ok = await commitGridCell({
      row,
      col: { key: 'note', label: '备注' },
      value: 'b',
      before: 'a',
      apiTable: 'fa',
      history,
    })
    expect(ok).toBe(true)
    expect(history.stack.value.length).toBe(1)
    expect(persistLedgerCell).toHaveBeenCalledOnce()
  })

  it('保存失败不入栈', async () => {
    const history = useEditHistory('t1')
    const row = { id: '1', note: 'a' }
    const ok = await commitGridCell({
      row,
      col: { key: 'note', label: '备注' },
      value: 'b',
      before: 'a',
      apiTable: 'fa',
      history,
    })
    expect(ok).toBe(false)
    expect(history.stack.value.length).toBe(0)
  })
})