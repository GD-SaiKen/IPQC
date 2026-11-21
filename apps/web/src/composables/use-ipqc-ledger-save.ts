import { ElMessage } from 'element-plus'

import {
  createLedgerRow,
  deleteLedgerRow,
  patchLedgerRow,
} from '@/api/ledger'
import type { LedgerApiTable } from '@/composables/ledger-table-key'

export async function persistLedgerCell(
  table: LedgerApiTable,
  row: Record<string, unknown>,
  key: string,
  value: unknown,
  before: unknown,
): Promise<void> {
  const id = String(row.id ?? '')
  if (!id) {
    throw new Error('缺少行 id，无法保存')
  }
  row[key] = value
  try {
    await patchLedgerRow(table, id, { [key]: value })
  } catch (error) {
    row[key] = before
    ElMessage.error('保存失败，请重试')
    throw error
  }
}

export async function persistLedgerUndo(
  table: LedgerApiTable,
  row: Record<string, unknown>,
  key: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await persistLedgerCell(table, row, key, before, after)
}

export async function createLedgerTableRow(
  table: LedgerApiTable,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    return await createLedgerRow(table, body)
  } catch {
    ElMessage.error('新增失败')
    throw new Error('create failed')
  }
}

export async function removeLedgerTableRow(
  table: LedgerApiTable,
  row: Record<string, unknown>,
): Promise<void> {
  const id = String(row.id ?? '')
  if (!id) {
    throw new Error('缺少行 id')
  }
  try {
    await deleteLedgerRow(table, id)
  } catch {
    ElMessage.error('删除失败')
    throw new Error('delete failed')
  }
}