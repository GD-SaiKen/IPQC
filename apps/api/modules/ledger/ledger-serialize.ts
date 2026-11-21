import type { LedgerTableKey } from './ledger-tables'
import { NUM_FIELDS, TEXT_FIELDS } from './ledger-tables'
import { decimalToJson } from './text-value'

export function serializeRow(table: LedgerTableKey, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: row.id,
    sourceKey: row.sourceKey ?? null,
    sourceFile: row.sourceFile ?? null,
    sourceSheet: row.sourceSheet ?? null,
    sourceRow: row.sourceRow ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }

  for (const key of Object.keys(TEXT_FIELDS[table])) {
    if (table === 'cmp' && key === 'from') {
      out.from = row.from ?? ''
      continue
    }
    out[key] = row[key] ?? ''
  }

  for (const key of NUM_FIELDS[table]) {
    out[key] = decimalToJson(row[key] as { toString: () => string } | null | undefined)
  }

  if (table === 'skill') {
    out.lv = Array.isArray(row.lv) ? row.lv : []
  }

  if (['mat', 'trn', 'exam', 'skill'].includes(table)) {
    delete out.sourceKey
    delete out.sourceFile
    delete out.sourceSheet
    delete out.sourceRow
  }

  return out
}