import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common'

import { apiError, API_MSG } from '../../common/api-error'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/current-user.decorator'
import { LedgerSyncBodyDto } from './dto/ledger-sync-body.dto'
import { LedgerEntriesQueryDto } from './dto/ledger-entries-query.dto'
import { LedgerSharesQueryDto } from './dto/ledger-shares-query.dto'
import { LedgerSyncService } from './ledger-sync.service'

@Controller('ledger-sync')
export class LedgerSyncController {
  @Inject(LedgerSyncService)
  private readonly ledgerSync!: LedgerSyncService

  @Get('shares')
  listShares(@CurrentUser() user: AuthUser, @Query() query: LedgerSharesQueryDto) {
    return this.ledgerSync.listShares(user, query)
  }

  @Get('shares/:shareId/entries')
  listShareEntries(
    @CurrentUser() user: AuthUser,
    @Param('shareId') shareId: string,
    @Query() query: LedgerEntriesQueryDto,
  ) {
    return this.ledgerSync.listShareEntries(user, shareId, query)
  }

  @Post('scope')
  scope(@CurrentUser() user: AuthUser, @Body() body: LedgerSyncBodyDto) {
    return this.ledgerSync.scope(user, body)
  }

  @Post('preview')
  preview(@CurrentUser() user: AuthUser, @Body() body: LedgerSyncBodyDto) {
    return this.ledgerSync.preview(user, body)
  }

  @Post()
  sync() {
    throw apiError(410, '请使用立即同步', API_MSG.gone)
  }
}