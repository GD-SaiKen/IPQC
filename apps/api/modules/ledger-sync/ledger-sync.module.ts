import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { LedgerSyncController } from './ledger-sync.controller'
import { LedgerSyncService } from './ledger-sync.service'

@Module({
  imports: [AuthModule],
  controllers: [LedgerSyncController],
  providers: [LedgerSyncService],
})
export class LedgerSyncModule {}