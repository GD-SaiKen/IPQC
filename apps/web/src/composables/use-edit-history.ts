import { computed, ref } from 'vue'

export interface EditEntry {
  row: Record<string, unknown>
  key: string
  before: unknown
  after: unknown
  label: string
  tableId: string
}

/**
 * 当前表最近编辑栈。只回退本表最近一次单元格编辑，不跨表、不回退整页操作。
 */
export function useEditHistory(tableId: string) {
  const stack = ref<EditEntry[]>([])
  const canUndo = computed(() => stack.value.length > 0)
  const lastLabel = computed(() =>
    stack.value.length ? stack.value[stack.value.length - 1].label : ''
  )

  function push(entry: Omit<EditEntry, 'tableId'>): void {
    if (String(entry.before ?? '') === String(entry.after ?? '')) return
    stack.value.push({ ...entry, tableId })
    if (stack.value.length > 120) stack.value.shift()
  }

  function undo(): EditEntry | null {
    const entry = stack.value.pop()
    if (!entry) return null
    entry.row[entry.key] = entry.before
    return entry
  }

  function clear(): void {
    stack.value = []
  }

  return { stack, canUndo, lastLabel, push, undo, clear }
}
