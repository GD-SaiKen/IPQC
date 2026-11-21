import { Body, Controller, Get, Inject, Param, Post, Put, Query } from '@nestjs/common'

import { apiError, API_MSG } from '../../common/api-error'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/current-user.decorator'
import { PutLedgerSyncConfigDto } from './dto/ledger-sync-config.dto'
import { LedgerSyncBodyDto } from './dto/ledger-sync-body.dto'
import { LedgerSyncRunDto } from './dto/ledger-sync-run.dto'
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

  @Get('config')
  getConfig(@CurrentUser() user: AuthUser) {
    return this.ledgerSync.getSyncConfig(user)
  }

  @Put('config')
  putConfig(@CurrentUser() user: AuthUser, @Body() body: PutLedgerSyncConfigDto) {
    return this.ledgerSync.putSyncConfig(user, body)
  }

  @Post('run')
  runSync(@CurrentUser() user: AuthUser, @Body() body: LedgerSyncRunDto) {
    return this.ledgerSync.runSync(user, body)
  }

  @Get('runs')
  listRuns(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ledgerSync.listSyncRuns(user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Get('runs/:id/diffs')
  listRunDiffs(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ledgerSync.listRunDiffs(user, id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }
}