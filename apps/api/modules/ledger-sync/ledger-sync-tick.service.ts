import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { PrismaService } from '../../common/prisma/prisma.service'
import { LedgerSyncService } from './ledger-sync.service'
import { markInterruptedSyncRuns, purgeOldSyncHistory } from './sync-run-helpers'
import { shouldStartScheduledSync, shanghaiDateKey } from './sync-schedule'

const CONFIG_ID = '00000000-0000-0000-0000-000000000001'
const TICK_MS = 60_000

@Injectable()
export class LedgerSyncTickService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(LedgerSyncTickService.name)
  private timer?: ReturnType<typeof setInterval>
  private ticking = false

  @Inject(PrismaService)
  private readonly prisma!: PrismaService

  @Inject(LedgerSyncService)
  private readonly ledgerSync!: LedgerSyncService

  onModuleInit(): void {
    void this.tick()
    this.timer = setInterval(() => void this.tick(), TICK_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  async tick(): Promise<void> {
    if (this.ticking) {
      return
    }
    this.ticking = true
    const now = new Date()
    try {
      const interrupted = await markInterruptedSyncRuns(this.prisma, now)
      if (interrupted > 0) {
        this.log.warn(`已将 ${interrupted} 条超时同步标为中断`)
      }
      await purgeOldSyncHistory(this.prisma, now)
      await this.maybeStartScheduledSync(now)
    } catch (error) {
      this.log.error('台账同步分钟检查失败', error instanceof Error ? error.stack : String(error))
    } finally {
      this.ticking = false
    }
  }

  private async maybeStartScheduledSync(now: Date): Promise<void> {
    const config = await this.prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
    if (!config?.shareId || !config.savedByUserId) {
      return
    }
    if (!(config.selectedEntries as unknown[])?.length) {
      return
    }

    const scheduledRunDate = shanghaiDateKey(now)
    const existing = await this.prisma.ledgerSyncRun.findFirst({
      where: { runType: 'scheduled', scheduledRunDate },
      select: { id: true },
    })
    const hasScheduledRunToday = Boolean(existing)
    if (
      !shouldStartScheduledSync({
        now,
        hour: config.hour,
        minute: config.minute,
        hasScheduledRunToday,
      })
    ) {
      return
    }

    try {
      await this.ledgerSync.runScheduledSync(scheduledRunDate)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return
      }
      this.log.warn(
        `定时同步未成功：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}