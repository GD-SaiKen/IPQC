import type { LedgerSnapshot } from './map-workbook'
import { buildSourceKey, type SourceKeyTable } from '../ledger/source-key'
import type { ShareSyncRow } from './apply-sync'

function defaultPath(table: SourceKeyTable): string {
  return `sync/${table}`
}

export function buildShareRowsFromSnapshot(snapshot: LedgerSnapshot): ShareSyncRow[] {
  const tables: SourceKeyTable[] = ['fa', 'fqcNg', 'fqc', 'cmp', 'perf']
  const rows: ShareSyncRow[] = []
  for (const table of tables) {
    const list = snapshot[table] as Record<string, unknown>[]
    if (!Array.isArray(list)) continue
    list.forEach((fields, index) => {
      const segments = segmentFields(table, fields)
      const sourceKey = buildSourceKey({
        table,
        segments,
        sourceFile: defaultPath(table),
        sourceSheet: 'Sheet1',
        sourceRow: index + 2,
      })
      if (!sourceKey) return
      rows.push({
        table,
        sourceKey,
        sourceFile: defaultPath(table),
        sourceSheet: 'Sheet1',
        sourceRow: index + 2,
        fields,
      })
    })
  }
  return rows
}

function segmentFields(table: SourceKeyTable, fields: Record<string, unknown>): Record<string, string> {
  switch (table) {
    case 'fa':
      return {
        date: String(fields.date ?? ''),
        dept: String(fields.dept ?? ''),
        pn: String(fields.pn ?? ''),
        item: String(fields.item ?? ''),
        stage: String(fields.stage ?? ''),
      }
    case 'fqcNg':
      return {
        ws: String(fields.ws ?? ''),
        d: String(fields.d ?? fields.date ?? ''),
        pn: String(fields.pn ?? ''),
        lot: String(fields.lot ?? ''),
      }
    case 'fqc':
      return {
        date: String(fields.date ?? ''),
        pn: String(fields.pn ?? ''),
        issue: String(fields.issue ?? ''),
      }
    case 'cmp':
      return {
        date: String(fields.date ?? ''),
        dept: String(fields.dept ?? ''),
        pn: String(fields.pn ?? ''),
        issue: String(fields.issue ?? ''),
      }
    case 'perf':
      return {
        date: String(fields.date ?? ''),
        dept: String(fields.dept ?? ''),
        who: String(fields.who ?? ''),
        item: String(fields.item ?? ''),
      }
    default:
      return {}
  }
}