import { defineStore } from 'pinia'
import { exportDbJson, importDbJson, loadDb, resetDb, saveDb } from '@/db/ipqc-store'
import { getCheckScores } from '@/domain/ipqc/seed'
import type { CheckScores, IpqcDb, WorkshopFilter } from '@/domain/ipqc/types'

export const useIpqcStore = defineStore('ipqc', {
  state: () => ({
    db: loadDb() as IpqcDb,
    checkScores: getCheckScores() as CheckScores,
    workshop: '全部' as WorkshopFilter,
    boardMonth: 0,
    lastSavedAt: '',
    storageOk: true,
  }),
  actions: {
    persist() {
      this.storageOk = saveDb(this.db)
      if (this.storageOk) {
        this.lastSavedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      }
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
    restoreSeed() {
      this.db = resetDb()
      this.checkScores = getCheckScores()
      this.persist()
    },
  },
})
