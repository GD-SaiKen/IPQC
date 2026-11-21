import { Prisma } from '@prisma/client'

import { apiError } from '../../common/api-error'
import type { PrismaService } from '../../common/prisma/prisma.service'
import type { SourceKeyTable } from '../ledger/source-key'
import { MAX_ROWS_PER_TABLE, NUM_FIELDS, TEXT_FIELDS } from '../ledger/ledger-tables'
import { parseOptionalNumber, sanitizeText } from '../ledger/text-value'
import {
  applySync,
  checkScoreMapKey,
  type ApplySyncOutput,
  type GridSyncRow,
} from './apply-sync'
import type { CheckScoresPayload } from './map-workbook'
import type { LedgerSnapshot } from './map-workbook'
import { buildShareRowsFromSnapshot } from './share-snapshot-rows'

const SYNC_TABLES: SourceKeyTable[] = ['fa', 'fqcNg', 'fqc', 'cmp', 'perf']

function rowToFields(table: SourceKeyTable, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(TEXT_FIELDS[table])) {
    if (table === 'cmp' && key === 'from') {
      out.from = row.from ?? ''
    } else {
      out[key] = row[key] ?? ''
    }
  }
  for (const key of NUM_FIELDS[table]) {
    const value = row[key]
    out[key] = value === null || value === undefined ? null : Number((value as { toString?: () => string }).toString?.() ?? value)
  }
  return out
}

async function loadGrids(prisma: PrismaService): Promise<Record<SourceKeyTable, GridSyncRow[]>> {
  const grids: Record<SourceKeyTable, GridSyncRow[]> = {
    fa: [],
    fqcNg: [],
    fqc: [],
    cmp: [],
    perf: [],
  }
  const fa = await prisma.ledgerFa.findMany()
  grids.fa = fa.map((r) => ({
    id: r.id,
    sourceKey: r.sourceKey,
    fields: rowToFields('fa', r as unknown as Record<string, unknown>),
  }))
  const fqcNg = await prisma.ledgerFqcNg.findMany()
  grids.fqcNg = fqcNg.map((r) => ({
    id: r.id,
    sourceKey: r.sourceKey,
    fields: rowToFields('fqcNg', r as unknown as Record<string, unknown>),
  }))
  const fqc = await prisma.ledgerFqc.findMany()
  grids.fqc = fqc.map((r) => ({
    id: r.id,
    sourceKey: r.sourceKey,
    fields: rowToFields('fqc', r as unknown as Record<string, unknown>),
  }))
  const cmp = await prisma.ledgerCmp.findMany()
  grids.cmp = cmp.map((r) => ({
    id: r.id,
    sourceKey: r.sourceKey,
    fields: rowToFields('cmp', r as unknown as Record<string, unknown>),
  }))
  const perf = await prisma.ledgerPerf.findMany()
  grids.perf = perf.map((r) => ({
    id: r.id,
    sourceKey: r.sourceKey,
    fields: rowToFields('perf', r as unknown as Record<string, unknown>),
  }))
  return grids
}

function buildCheckScoreMaps(
  existing: Array<{ workshop: string; month: string; score: Prisma.Decimal }>,
  incoming: CheckScoresPayload,
): {
  existing: Map<string, number>
  incoming: Map<string, number>
} {
  const ex = new Map<string, number>()
  for (const row of existing) {
    ex.set(checkScoreMapKey(row.workshop, row.month), Number(row.score.toString()))
  }
  const inc = new Map<string, number>()
  for (const [workshop, months] of Object.entries(incoming)) {
    for (const [month, score] of Object.entries(months)) {
      inc.set(checkScoreMapKey(workshop, month), score)
    }
  }
  return { existing: ex, incoming: inc }
}

function buildCreateData(
  table: SourceKeyTable,
  fields: Record<string, unknown>,
  meta: { sourceKey: string; sourceFile?: string; sourceSheet?: string; sourceRow?: number },
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    sourceKey: meta.sourceKey,
    sourceFile: meta.sourceFile ?? null,
    sourceSheet: meta.sourceSheet ?? null,
    sourceRow: meta.sourceRow ?? null,
  }
  for (const [field, max] of Object.entries(TEXT_FIELDS[table])) {
    const sanitized = sanitizeText(field, fields[field], max)
    if (!sanitized.ok) {
      throw apiError(400, sanitized.message)
    }
    if (table === 'cmp' && field === 'from') {
      data.from = sanitized.value
    } else {
      data[field] = sanitized.value
    }
  }
  for (const field of NUM_FIELDS[table]) {
    const parsed = parseOptionalNumber(field, fields[field])
    if (!parsed.ok) {
      throw apiError(400, parsed.message)
    }
    data[field] = parsed.value === null ? null : new Prisma.Decimal(parsed.value)
  }
  return data
}

type LedgerCreateDelegate = {
  count: () => Promise<number>
  create: (args: unknown) => Promise<unknown>
}

const DELEGATE: Record<SourceKeyTable, (p: PrismaService) => LedgerCreateDelegate> = {
  fa: (p) => p.ledgerFa as unknown as LedgerCreateDelegate,
  fqcNg: (p) => p.ledgerFqcNg as unknown as LedgerCreateDelegate,
  fqc: (p) => p.ledgerFqc as unknown as LedgerCreateDelegate,
  cmp: (p) => p.ledgerCmp as unknown as LedgerCreateDelegate,
  perf: (p) => p.ledgerPerf as unknown as LedgerCreateDelegate,
}

export async function planSyncApply(
  prisma: PrismaService,
  snapshot: LedgerSnapshot,
  checkScores: CheckScoresPayload,
): Promise<ApplySyncOutput> {
  const grids = await loadGrids(prisma)
  const tombstones = await prisma.ledgerTombstone.findMany()
  const tombSet = new Set(tombstones.map((t) => `${t.tableName}\u0001${t.sourceKey}`))
  const existingScores = await prisma.checkScore.findMany()
  const shareRows = buildShareRowsFromSnapshot(snapshot)
  return applySync({
    grids,
    tombstones: tombSet,
    shareRows,
    checkScores: buildCheckScoreMaps(existingScores, checkScores),
  })
}

export async function executeSyncWrites(
  prisma: PrismaService,
  plan: ApplySyncOutput,
): Promise<void> {
  const byTable: Record<SourceKeyTable, number> = {
    fa: 0,
    fqcNg: 0,
    fqc: 0,
    cmp: 0,
    perf: 0,
  }
  for (const table of SYNC_TABLES) {
    byTable[table] = await DELEGATE[table](prisma).count()
  }
  for (const row of plan.inserts) {
    if (byTable[row.table] + 1 > MAX_ROWS_PER_TABLE) {
      throw apiError(409, `${row.table} 已达 ${MAX_ROWS_PER_TABLE} 行上限`)
    }
    byTable[row.table] += 1
    const data = buildCreateData(row.table, row.fields, row)
    await DELEGATE[row.table](prisma).create({ data })
  }
  for (const item of plan.checkScoreUpdates) {
    if (Number.isNaN(item.oldScore)) {
      await prisma.checkScore.create({
        data: {
          workshop: item.workshop,
          month: item.month,
          score: new Prisma.Decimal(item.score),
        },
      })
    } else {
      await prisma.checkScore.updateMany({
        where: { workshop: item.workshop, month: item.month },
        data: { score: new Prisma.Decimal(item.score) },
      })
    }
  }
}