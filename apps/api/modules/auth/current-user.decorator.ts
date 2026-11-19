import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'

import type { AuthUser } from './auth.types'

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>()
  if (!request.user) {
    throw new UnauthorizedException('请先登录')
  }
  return request.user
})
