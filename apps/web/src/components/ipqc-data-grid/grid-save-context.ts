import type { LedgerApiTable } from '@/composables/ledger-table-key'
import type { useEditHistory } from '@/composables/use-edit-history'

type Row = Record<string, unknown>

export interface IpqcGridSaveContext {
  tableId: string
  history: ReturnType<typeof useEditHistory>
  markSaved: () => void
  onChange: (row: Row, key: string, value: unknown) => void
  onDelete: (row: Row) => void
  ledgerTable: () => LedgerApiTable | undefined
}

let active: IpqcGridSaveContext | null = null

export function setGridSaveContext(ctx: IpqcGridSaveContext | null): void {
  active = ctx
}

export function getGridSaveContext(): IpqcGridSaveContext | null {
  return active
}