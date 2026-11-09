import { createDefaultDb, STORAGE_KEY } from '@/domain/ipqc/seed'
import type { IpqcDb } from '@/domain/ipqc/types'
import { allFqcRows } from '@/domain/ipqc/fqc'

function mergeFqcNg(old: Record<string, unknown>[] | undefined): Record<string, unknown>[] {
  const all = allFqcRows()
  if (!Array.isArray(old) || !old.length) return all
  const idx: Record<string, number> = {}
  all.forEach((r, i) => {
    const row = r as { ws?: string; d?: string; pn?: string; lot?: string }
    idx[`${row.ws}|${row.d}|${row.pn}|${row.lot}`] = i
  })
  old.forEach((r) => {
    const row = r as { ws?: string; d?: string; pn?: string; lot?: string }
    const k = `${row.ws || '注塑'}|${row.d}|${row.pn}|${row.lot}`
    if (idx[k] != null) all[idx[k]] = { ...r, ws: row.ws || '注塑' }
  })
  return all
}

export function loadDb(): IpqcDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw) as IpqcDb
      if (d?.fa?.length) {
        d.fqcNg = mergeFqcNg(d.fqcNg as Record<string, unknown>[])
        return d
      }
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
  const d = JSON.parse(text) as IpqcDb
  if (!d?.fa) throw new Error('invalid ipqc backup')
  d.fqcNg = mergeFqcNg(d.fqcNg as Record<string, unknown>[])
  return d
}

export function resetDb(): IpqcDb {
  localStorage.removeItem(STORAGE_KEY)
  return createDefaultDb()
}
