import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common'

import { LedgerService } from './ledger.service'

@Controller('ledger')
export class LedgerController {
  @Inject(LedgerService)
  private readonly ledger!: LedgerService

  @Get()
  getSnapshot() {
    return this.ledger.getSnapshot()
  }

  @Get('export')
  exportJson() {
    return this.ledger.exportJson()
  }

  @Get(':table/:id')
  getRow(@Param('table') table: string, @Param('id') id: string) {
    return this.ledger.getRow(table, id)
  }

  @Post(':table')
  createRow(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    return this.ledger.createRow(table, body)
  }

  @Patch(':table/:id')
  patchRow(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.ledger.patchRow(table, id, body)
  }

  @Delete(':table/:id')
  deleteRow(@Param('table') table: string, @Param('id') id: string) {
    return this.ledger.deleteRow(table, id)
  }
}