import { normalizeLedgerPath } from '../ledger-sync/select-files'
import { assertNoControlInSourceKeyParts, RECORD_SEPARATOR } from './text-value'

export type SourceKeyTable = 'fa' | 'fqcNg' | 'fqc' | 'cmp' | 'perf'

export interface SourceKeyInput {
  table: SourceKeyTable
  segments: Record<string, string>
  sourceFile?: string
  sourceSheet?: string
  sourceRow?: number
}

const SEGMENT_ORDER: Record<SourceKeyTable, string[]> = {
  fa: ['date', 'dept', 'pn', 'item', 'stage'],
  fqcNg: ['ws', 'd', 'pn', 'lot'],
  fqc: ['date', 'pn', 'issue'],
  cmp: ['date', 'dept', 'pn', 'issue'],
  perf: ['date', 'dept', 'who', 'item'],
}

function cleanSegment(raw: string): string {
  return raw.normalize('NFC').replace(/^[\p{White_Space}]+|[\p{White_Space}]+$/gu, '')
}

export function buildSourceKey(input: SourceKeyInput): string | null {
  const order = SEGMENT_ORDER[input.table]
  const businessParts = order.map((key) => cleanSegment(input.segments[key] ?? ''))
  assertNoControlInSourceKeyParts(businessParts, 'sourceKey 业务段')

  const hasEmpty = businessParts.some((p) => p === '')
  const parts = [...businessParts]

  if (hasEmpty) {
    const path = input.sourceFile ? normalizeLedgerPath(input.sourceFile).toLowerCase() : ''
    const sheet = input.sourceSheet ?? ''
    const row = input.sourceRow === undefined ? '' : String(input.sourceRow)
    assertNoControlInSourceKeyParts([path, sheet, row], 'sourceKey 来源段')
    parts.push(path, sheet, row)
  }

  return parts.join(RECORD_SEPARATOR)
}