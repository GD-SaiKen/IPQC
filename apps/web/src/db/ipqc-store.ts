import { createDefaultDb, STORAGE_KEY } from '@/domain/ipqc/seed'
import type { IpqcDb } from '@/domain/ipqc/types'

const TABLE_KEYS = [
  'fa',
  'fqc',
  'fqcNg',
  'cmp',
  'perf',
  'mat',
  'trn',
  'exam',
  'skill',
] as const

export function isIpqcDb(value: unknown): value is IpqcDb {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return TABLE_KEYS.every((k) => {
    const rows = d[k]
    return (
      Array.isArray(rows) &&
      rows.every((row) => !!row && typeof row === 'object' && !Array.isArray(row))
    )
  })
}

export function loadDb(): IpqcDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d: unknown = JSON.parse(raw)
      if (isIpqcDb(d)) return d
    }
  } catch {
    /* fall through */
  }
  return createDefaultDb()
}

export function saveDb(db: IpqcDb): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}

export function exportDbJson(db: IpqcDb): string {
  return JSON.stringify(db, null, 2)
}

export function importDbJson(text: string): IpqcDb {
  const d: unknown = JSON.parse(text)
  if (!isIpqcDb(d)) throw new Error('invalid ipqc backup')
  return d
}

export function resetDb(): IpqcDb {
  localStorage.removeItem(STORAGE_KEY)
  return createDefaultDb()
}
