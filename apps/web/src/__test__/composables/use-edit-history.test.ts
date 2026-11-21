import { describe, expect, it } from 'vitest'

import { useEditHistory } from '@/composables/use-edit-history'

describe('use-edit-history', () => {
  it('栈超过 20 步丢弃最早一步', () => {
    const h = useEditHistory('fa')
    const row: Record<string, unknown> = { a: 0 }
    for (let i = 0; i < 22; i += 1) {
      h.push({ row, key: 'a', before: i, after: i + 1, label: '测试' })
    }
    expect(h.stack.value.length).toBe(20)
    expect(h.stack.value[0]?.before).toBe(2)
  })

  it('peek 不弹出条目', () => {
    const h = useEditHistory('fa')
    const row = { a: 1 }
    h.push({ row, key: 'a', before: 1, after: 2, label: '字段' })
    expect(h.peek()?.after).toBe(2)
    expect(h.canUndo.value).toBe(true)
    h.undo()
    expect(row.a).toBe(1)
  })
})