import { Injectable, Logger } from '@nestjs/common'
import type { OnModuleInit } from '@nestjs/common'

import { PrismaService } from '../../common/prisma/prisma.service'
import { ensureDefaultLedgerSyncConfig } from './ensure-default-ledger-sync-config'

@Injectable()
export class LedgerSyncBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(LedgerSyncBootstrapService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const applied = await ensureDefaultLedgerSyncConfig(this.prisma)
      if (applied) {
        this.logger.log('已写入默认台账文件绑定（config/ledger-default-bindings.json）')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`默认台账绑定未写入：${message}`)
    }
  }
}