import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import { AuthService } from './auth.service'
import type { AuthUser } from './auth.types'
import { AUTH_COOKIE_NAME } from './auth.constants'
import { IS_PUBLIC_KEY } from './public.decorator'

@Injectable()
export class SessionGuard implements CanActivate {
  @Inject(AuthService)
  private readonly auth!: AuthService

  @Inject(Reflector)
  private readonly reflector!: Reflector

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const token = request.cookies?.[AUTH_COOKIE_NAME]
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('请先登录')
    }

    const user = await this.auth.resolveSession(token)
    if (!user) {
      throw new UnauthorizedException('请先登录')
    }
    request.user = user
    return true
  }
}
