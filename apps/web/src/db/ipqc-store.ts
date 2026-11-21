import { createEmptyDb } from '@/domain/ipqc/seed'
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

/** @deprecated 不再读取 localStorage，仅返回空库形状 */
export function loadDb(): IpqcDb {
  return createEmptyDb()
}

/** @deprecated 台账由服务器保存，本函数为兼容旧页面调用，恒为 true */
export function saveDb(_db: IpqcDb): boolean {
  return true
}

export function exportDbJson(db: IpqcDb): string {
  return JSON.stringify(db, null, 2)
}

export function importDbJson(text: string): IpqcDb {
  const d: unknown = JSON.parse(text)
  if (!isIpqcDb(d)) throw new Error('invalid ipqc backup')
  return d
}