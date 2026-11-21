import { Module } from '@nestjs/common'

import { PrismaModule } from '../../common/prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { LedgerSyncController } from './ledger-sync.controller'
import { LedgerSyncService } from './ledger-sync.service'
import { LedgerSyncTickService } from './ledger-sync-tick.service'
import { LedgerSyncBootstrapService } from './ledger-sync-bootstrap.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LedgerSyncController],
  providers: [LedgerSyncService, LedgerSyncTickService, LedgerSyncBootstrapService],
})
export class LedgerSyncModule {}