import { Module } from '@nestjs/common'

import { PrismaModule } from '../../common/prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { LedgerSyncController } from './ledger-sync.controller'
import { LedgerSyncService } from './ledger-sync.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LedgerSyncController],
  providers: [LedgerSyncService],
})
export class LedgerSyncModule {}