import { describe, expect, it } from 'vitest'
import { importDbJson, isIpqcDb } from '@/db/ipqc-store'
import { createDefaultDb } from '@/domain/ipqc/seed'

describe('ipqc-store · 备份导入', () => {
  it('完整备份原样导入，不重建种子行', () => {
    const db = createDefaultDb()
    const first = db.fqcNg[0] as Record<string, unknown>
    first.lot = 999
    first.bad = 888
    const back = importDbJson(JSON.stringify(db))
    expect(back.fqcNg.length).toBe(db.fqcNg.length)
    expect((back.fqcNg[0] as Record<string, unknown>).lot).toBe(999)
    expect((back.fqcNg[0] as Record<string, unknown>).bad).toBe(888)
  })

  it('重复键行编辑后仍保留整行', () => {
    const db = createDefaultDb()
    const dup = db.fqcNg[0] as Record<string, unknown>
    dup.ws = 'EDITED-WS'
    dup.pn = 'EDITED-PN'
    const back = importDbJson(JSON.stringify(db))
    expect((back.fqcNg[0] as Record<string, unknown>).ws).toBe('EDITED-WS')
    expect((back.fqcNg[0] as Record<string, unknown>).pn).toBe('EDITED-PN')
  })

  it('缺表、非数组或缺 fa 的备份被拒绝', () => {
    expect(() => importDbJson('{"fa":"x"}')).toThrow()
    expect(isIpqcDb({ fa: [] })).toBe(false)
    const db = createDefaultDb() as unknown as Record<string, unknown>
    delete db.cmp
    expect(() => importDbJson(JSON.stringify(db))).toThrow()
    ;(db as Record<string, unknown>).cmp = []
    ;(db as Record<string, unknown>).perf = 'x'
    expect(() => importDbJson(JSON.stringify(db))).toThrow()
  })
})
