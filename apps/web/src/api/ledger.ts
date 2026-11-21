import { request } from '@/utils/request'
import type { CheckScores, IpqcDb } from '@/domain/ipqc/types'

const BASE = '/ledger'

export interface LedgerSnapshotResponse extends IpqcDb {
  checkScores: {
    list: Array<{
      id: string
      workshop: string
      month: string
      score: number
      updatedAt: string
    }>
  }
}

function listToCheckScores(
  list: LedgerSnapshotResponse['checkScores']['list'],
): CheckScores {
  const out: CheckScores = {}
  for (const item of list) {
    const bucket = out[item.workshop] ?? (out[item.workshop] = {})
    const monthKey = Number(item.month)
    if (Number.isFinite(monthKey)) {
      bucket[monthKey] = item.score
    } else {
      bucket[item.month as unknown as number] = item.score
    }
  }
  return out
}

export async function fetchLedgerSnapshot(): Promise<{
  db: IpqcDb
  checkScores: CheckScores
}> {
  const data = await request.get<LedgerSnapshotResponse>(BASE)
  const { checkScores, ...db } = data
  return { db, checkScores: listToCheckScores(checkScores.list) }
}

export async function createLedgerRow(
  table: keyof IpqcDb,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request.post<Record<string, unknown>>(`${BASE}/${table}`, body)
}

export async function patchLedgerRow(
  table: string,
  id: string,
  body: Record<string, unknown>,
): Promise<{ id: string; updated: boolean }> {
  return request.patch(`${BASE}/${table}/${id}`, body)
}

export async function deleteLedgerRow(
  table: string,
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  return request.delete(`${BASE}/${table}/${id}`)
}

export async function fetchLedgerRow(
  table: string,
  id: string,
): Promise<Record<string, unknown>> {
  return request.get(`${BASE}/${table}/${id}`)
}

export function exportLedgerJson(): Promise<Record<string, unknown>> {
  return request.get(`${BASE}/export`)
}