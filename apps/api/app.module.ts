import { Module } from '@nestjs/common'

import { PrismaModule, RuntimeConfigModule } from './common'
import { AuthModule } from './modules/auth/auth.module'
import { LedgerSyncModule } from './modules/ledger-sync/ledger-sync.module'

@Module({
  imports: [RuntimeConfigModule, PrismaModule, AuthModule, LedgerSyncModule],
})
export class AppModule {}
