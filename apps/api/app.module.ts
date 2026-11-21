import { Module } from '@nestjs/common'

import { PrismaModule, RuntimeConfigModule } from './common'
import { AuthModule } from './modules/auth/auth.module'
import { LedgerModule } from './modules/ledger/ledger.module'
import { LedgerSyncModule } from './modules/ledger-sync/ledger-sync.module'

@Module({
  imports: [RuntimeConfigModule, PrismaModule, AuthModule, LedgerModule, LedgerSyncModule],
})
export class AppModule {}
