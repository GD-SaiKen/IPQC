import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchLedgerSnapshot } from '@/api/ledger'
import { createEmptyDb } from '@/domain/ipqc/seed'
import { useIpqcStore } from '@/stores/ipqc'

vi.mock('@/api/ledger', () => ({
  fetchLedgerSnapshot: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}))

describe('ipqc store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchLedgerSnapshot).mockReset()
  })

  it('loadLedger 成功时写入服务器快照', async () => {
    const db = createEmptyDb()
    db.fa.push({
      id: 'row-1',
      date: '2026-01-01',
      stage: '量产',
      dept: '注塑',
      pn: 'P1',
      part: '',
      item: '',
      spec: '',
      meas: '',
      result: 'OK',
      who: '',
      status: '已放行',
      action: '',
      eng: '',
    } as (typeof db.fa)[number])
    vi.mocked(fetchLedgerSnapshot).mockResolvedValue({
      db,
      checkScores: { 注塑: { 1: 95 } },
    })
    const store = useIpqcStore()
    await store.loadLedger()
    expect(store.ledgerLoaded).toBe(true)
    expect(store.storageOk).toBe(true)
    expect(store.db.fa).toHaveLength(1)
    expect(store.checkScores.注塑?.[1]).toBe(95)
  })

  it('loadLedger 失败时清空并标记 storageOk 失败', async () => {
    vi.mocked(fetchLedgerSnapshot).mockRejectedValue(new Error('network'))
    const store = useIpqcStore()
    await store.loadLedger()
    expect(store.db.fa).toHaveLength(0)
    expect(store.storageOk).toBe(false)
    expect(store.ledgerLoadError).toContain('无法')
  })
})