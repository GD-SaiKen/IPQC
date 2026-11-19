import { Module } from '@nestjs/common'

import { PrismaModule, RuntimeConfigModule } from './common'
import { AuthModule } from './modules/auth/auth.module'

@Module({
  imports: [RuntimeConfigModule, PrismaModule, AuthModule],
})
export class AppModule {}
