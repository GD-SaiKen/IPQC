import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { createEmptyDb } from '@/domain/ipqc/seed'
import { exportDbJson, importDbJson } from '@/db/ipqc-store'
import { fetchLedgerSnapshot } from '@/api/ledger'
import type { CheckScores, IpqcDb, WorkshopFilter } from '@/domain/ipqc/types'

export const useIpqcStore = defineStore('ipqc', {
  state: () => ({
    db: createEmptyDb() as IpqcDb,
    checkScores: {} as CheckScores,
    workshop: '全部' as WorkshopFilter,
    boardMonth: 0,
    lastSavedAt: '',
    storageOk: true,
    ledgerLoaded: false,
    ledgerLoadError: '',
  }),
  actions: {
    async loadLedger(): Promise<void> {
      try {
        const { db, checkScores } = await fetchLedgerSnapshot()
        this.db = db
        this.checkScores = checkScores
        this.storageOk = true
        this.ledgerLoadError = ''
        this.ledgerLoaded = true
      } catch {
        this.db = createEmptyDb()
        this.checkScores = {}
        this.storageOk = false
        this.ledgerLoadError = '无法从服务器加载台账'
        this.ledgerLoaded = true
        ElMessage.error(this.ledgerLoadError)
      }
    },
    persist() {
      this.storageOk = true
      this.lastSavedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    },
    setWorkshop(ws: WorkshopFilter) {
      this.workshop = ws
    },
    setBoardMonth(m: number) {
      this.boardMonth = m
    },
    patchDb(mutator: (db: IpqcDb) => void) {
      mutator(this.db)
      this.persist()
    },
    exportJson() {
      return exportDbJson(this.db)
    },
    importFromJson(text: string) {
      this.db = importDbJson(text)
      this.persist()
    },
  },
})