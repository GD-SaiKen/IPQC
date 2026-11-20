import { Body, Controller, Get, HttpCode, Inject, Post, Res } from '@nestjs/common'
import type { Response } from 'express'

import { AuthService } from './auth.service'
import type { AuthUser } from './auth.types'
import { CurrentUser } from './current-user.decorator'
import { DataHubLinkCallbackDto } from './dto/data-hub-link-callback.dto'
import { LoginDto } from './dto/login.dto'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  @Inject(AuthService)
  private readonly auth!: AuthService

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.loginWithPassword(response, dto)
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user)
  }

  @Get('data-hub/link')
  dataHubLinkStatus(@CurrentUser() user: AuthUser) {
    return this.auth.hasDataHubLink(user.id)
  }

  @Post('data-hub/link/start')
  @HttpCode(200)
  startDataHubLink() {
    return this.auth.startDataHubLink()
  }

  @Post('data-hub/link/callback')
  @HttpCode(200)
  finishDataHubLink(@CurrentUser() user: AuthUser, @Body() dto: DataHubLinkCallbackDto) {
    return this.auth.finishDataHubLink(user.id, dto)
  }

  @Post('data-hub/link/unlink')
  @HttpCode(200)
  unlinkDataHubLink(@CurrentUser() user: AuthUser) {
    return this.auth.unlinkDataHubLink(user.id)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    return this.auth.logout(user.sessionId, response)
  }
}