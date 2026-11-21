import type { SourceKeyTable } from '../ledger/source-key'
import { NUM_FIELDS, TEXT_FIELDS } from '../ledger/ledger-tables'

export type SyncDiffKind = 'diff' | 'unmatched' | 'tombstone_conflict'

export interface SyncDiffItem {
  tableName: string
  rowId?: string
  field: string
  shareValue: string
  gridValue: string
  kind: SyncDiffKind
  workshop?: string
  month?: string
}

export interface ShareSyncRow {
  table: SourceKeyTable
  sourceKey: string
  sourceFile?: string
  sourceSheet?: string
  sourceRow?: number
  fields: Record<string, unknown>
}

export interface GridSyncRow {
  id: string
  sourceKey: string | null
  fields: Record<string, unknown>
}

export interface ApplySyncInput {
  grids: Record<SourceKeyTable, GridSyncRow[]>
  tombstones: Set<string>
  shareRows: ShareSyncRow[]
  checkScores: {
    existing: Map<string, number>
    incoming: Map<string, number>
  }
}

export interface ApplySyncOutput {
  inserts: ShareSyncRow[]
  diffs: SyncDiffItem[]
  addedCount: number
  skippedCount: number
  diffCount: number
  unmatchedCount: number
  tombstoneSkipCount: number
  checkScoreUpdates: Array<{ workshop: string; month: string; score: number; oldScore: number }>
}

function tombstoneKey(table: string, sourceKey: string): string {
  return `${table}\u0001${sourceKey}`
}

function fieldValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String((value as { toString: () => string }).toString()).trim()
  }
  return String(value).trim()
}

function compareField(table: SourceKeyTable, field: string, a: unknown, b: unknown): boolean {
  const numFields = NUM_FIELDS[table]
  if (numFields.includes(field)) {
    const na = a === null || a === undefined || a === '' ? null : Number(a)
    const nb = b === null || b === undefined || b === '' ? null : Number(b)
    if (na === null && nb === null) return true
    if (na === null || nb === null || !Number.isFinite(na) || !Number.isFinite(nb)) {
      return fieldValue(a) === fieldValue(b)
    }
    return na === nb
  }
  return fieldValue(a) === fieldValue(b)
}

function businessFields(table: SourceKeyTable): string[] {
  return [...Object.keys(TEXT_FIELDS[table]), ...NUM_FIELDS[table]]
}

export function applySync(input: ApplySyncInput): ApplySyncOutput {
  const indexes: Record<SourceKeyTable, Map<string, GridSyncRow>> = {
    fa: new Map(),
    fqcNg: new Map(),
    fqc: new Map(),
    cmp: new Map(),
    perf: new Map(),
  }
  for (const table of Object.keys(indexes) as SourceKeyTable[]) {
    for (const row of input.grids[table]) {
      if (row.sourceKey) {
        indexes[table].set(row.sourceKey, row)
      }
    }
  }

  const inserts: ShareSyncRow[] = []
  const diffs: SyncDiffItem[] = []
  let addedCount = 0
  let skippedCount = 0
  let unmatchedCount = 0
  let tombstoneSkipCount = 0

  const seenShareKey = new Map<string, number>()
  for (const row of input.shareRows) {
    const dupKey = `${row.table}\u0001${row.sourceKey}`
    const n = (seenShareKey.get(dupKey) ?? 0) + 1
    seenShareKey.set(dupKey, n)
    if (n > 1) {
      unmatchedCount += 1
      diffs.push({
        tableName: row.table,
        field: 'sourceKey',
        shareValue: row.sourceKey,
        gridValue: '',
        kind: 'unmatched',
      })
      continue
    }

    const tKey = tombstoneKey(row.table, row.sourceKey)
    if (input.tombstones.has(tKey)) {
      const alive = indexes[row.table].get(row.sourceKey)
      if (alive) {
        diffs.push({
          tableName: row.table,
          rowId: alive.id,
          field: 'sourceKey',
          shareValue: row.sourceKey,
          gridValue: row.sourceKey,
          kind: 'tombstone_conflict',
        })
      } else {
        tombstoneSkipCount += 1
      }
      continue
    }

    const existing = indexes[row.table].get(row.sourceKey)
    if (!existing) {
      inserts.push(row)
      addedCount += 1
      continue
    }

    let rowDiff = false
    for (const field of businessFields(row.table)) {
      if (!compareField(row.table, field, existing.fields[field], row.fields[field])) {
        rowDiff = true
        diffs.push({
          tableName: row.table,
          rowId: existing.id,
          field,
          shareValue: fieldValue(row.fields[field]),
          gridValue: fieldValue(existing.fields[field]),
          kind: 'diff',
        })
      }
    }
    if (rowDiff) {
      /* 保留系统值，只记差异 */
    } else {
      skippedCount += 1
    }
  }

  const checkScoreUpdates: Array<{ workshop: string; month: string; score: number; oldScore: number }> = []
  for (const [key, score] of input.checkScores.incoming) {
    const old = input.checkScores.existing.get(key)
    if (old === undefined) {
      checkScoreUpdates.push({
        workshop: key.split('\u0001')[0]!,
        month: key.split('\u0001')[1]!,
        score,
        oldScore: NaN,
      })
      addedCount += 1
    } else if (!compareField('perf', 'score', old, score)) {
      checkScoreUpdates.push({
        workshop: key.split('\u0001')[0]!,
        month: key.split('\u0001')[1]!,
        score,
        oldScore: old,
      })
      diffs.push({
        tableName: 'checkScores',
        field: 'score',
        shareValue: fieldValue(score),
        gridValue: fieldValue(old),
        kind: 'diff',
        workshop: key.split('\u0001')[0],
        month: key.split('\u0001')[1],
      })
      skippedCount += 0
    } else {
      skippedCount += 1
    }
  }

  return {
    inserts,
    diffs,
    addedCount,
    skippedCount,
    diffCount: diffs.filter((d) => d.kind === 'diff').length,
    unmatchedCount,
    tombstoneSkipCount,
    checkScoreUpdates,
  }
}

export function checkScoreMapKey(workshop: string, month: string): string {
  return `${workshop}\u0001${month}`
}