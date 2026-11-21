import type { IpqcDb } from '@/domain/ipqc/types'

export type LedgerApiTable = keyof IpqcDb

const TABLE_ID_TO_API: Record<string, LedgerApiTable> = {
  fa: 'fa',
  'fqc-ng': 'fqcNg',
  'fqc-clear': 'fqc',
  cmp: 'cmp',
  perf: 'perf',
  'trn-mat': 'mat',
  'trn-record': 'trn',
  'trn-exam': 'exam',
}

export function ledgerApiTableFromId(tableId: string): LedgerApiTable | undefined {
  return TABLE_ID_TO_API[tableId]
}

/** 差异报告 deep link 用的路由与查询 */
export function diffLinkTarget(
  tableName: string,
  rowId?: string | null,
  workshop?: string | null,
  month?: string | null,
): { path: string; query: Record<string, string> } | null {
  if (tableName === 'checkScores' && workshop && month) {
    return { path: '/chk', query: { workshop, month } }
  }
  if (!rowId || tableName === 'checkScores') {
    return null
  }
  if (tableName === 'fa') {
    return { path: '/fa', query: { rowId } }
  }
  if (tableName === 'fqc' || tableName === 'fqcNg') {
    return { path: '/fqc', query: { rowId, table: tableName } }
  }
  if (tableName === 'cmp') {
    return { path: '/cmp', query: { rowId } }
  }
  if (tableName === 'perf') {
    return { path: '/perf', query: { rowId } }
  }
  if (tableName === 'mat' || tableName === 'trn' || tableName === 'exam' || tableName === 'skill') {
    return { path: '/trn', query: { rowId, table: tableName } }
  }
  return null
}