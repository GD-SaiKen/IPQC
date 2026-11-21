import { Module } from '@nestjs/common'

import { PrismaModule } from '../../common/prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { LedgerSyncController } from './ledger-sync.controller'
import { LedgerSyncService } from './ledger-sync.service'
import { LedgerSyncTickService } from './ledger-sync-tick.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LedgerSyncController],
  providers: [LedgerSyncService, LedgerSyncTickService],
})
export class LedgerSyncModule {}