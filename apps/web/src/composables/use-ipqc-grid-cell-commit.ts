import type { LedgerApiTable } from '@/composables/ledger-table-key'
import { persistLedgerCell } from '@/composables/use-ipqc-ledger-save'
import type { useEditHistory } from '@/composables/use-edit-history'

type Row = Record<string, unknown>

export interface GridEditColumn {
  key: string
  label: string
  type?: 'text' | 'num' | 'select'
  options?: string[]
  readOnly?: boolean
  format?: (row: Row) => string
}

export function normalizeGridCell(col: GridEditColumn, raw: string): unknown {
  const text = raw.trim()
  if (col.type === 'num') {
    if (text === '') return ''
    const n = Number(text)
    return Number.isFinite(n) ? n : text
  }
  return text
}

export async function commitGridCell(input: {
  row: Row
  col: GridEditColumn
  value: unknown
  before: unknown
  apiTable?: LedgerApiTable
  history: ReturnType<typeof useEditHistory>
  onSaved?: () => void
}): Promise<boolean> {
  if (input.col.readOnly || input.col.format) return false
  if (input.col.type === 'select' && !(input.col.options || []).includes(String(input.value))) {
    return false
  }
  if (String(input.value ?? '') === String(input.before ?? '')) return false

  if (input.apiTable) {
    try {
      await persistLedgerCell(input.apiTable, input.row, input.col.key, input.value, input.before)
    } catch {
      return false
    }
  } else {
    input.row[input.col.key] = input.value
  }

  input.history.push({
    row: input.row,
    key: input.col.key,
    before: input.before,
    after: input.value,
    label: input.col.label,
  })
  input.onSaved?.()
  return true
}