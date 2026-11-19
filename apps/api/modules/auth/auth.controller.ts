import { Body, Controller, Get, HttpCode, Inject, Post, Res } from '@nestjs/common'
import type { Response } from 'express'

import { AuthService } from './auth.service'
import type { AuthUser } from './auth.types'
import { CurrentUser } from './current-user.decorator'
import { DataHubCallbackDto } from './dto/data-hub-callback.dto'
import { Public } from './public.decorator'

@Controller('v1/auth')
export class AuthController {
  @Inject(AuthService)
  private readonly auth!: AuthService

  @Public()
  @Post('data-hub/start')
  @HttpCode(200)
  async start(@Res({ passthrough: true }) response: Response) {
    return this.auth.startDataHubLogin(response)
  }

  @Public()
  @Post('data-hub/callback')
  @HttpCode(200)
  callback(
    @Body() dto: DataHubCallbackDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.finishDataHubLogin(response, dto)
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    return this.auth.logout(user.sessionId, response)
  }
}
