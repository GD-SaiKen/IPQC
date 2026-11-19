import { createHash, randomBytes } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import type { User } from '@prisma/client'
import { Prisma } from '@prisma/client'
import type { Response } from 'express'

import { apiError, PrismaService, RuntimeConfigService } from '../../common'

import {
  AccountConflictError,
  completeDataHubLogin,
  type AccountStore,
} from './complete-data-hub-login'
import type { LocalAccount } from './identity'
import { buildAuthorizeUrl, createPkce } from './pkce'
import type { DataHubCallbackDto } from './dto/data-hub-callback.dto'
import type { AuthUser, PublicUser } from './auth.types'
import {
  AUTH_COOKIE_NAME,
  OAUTH_LOGIN_TTL_MS,
  OAUTH_STATE_COOKIE_NAME,
} from './auth.constants'

@Injectable()
export class AuthService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService

  @Inject(RuntimeConfigService)
  private readonly config!: RuntimeConfigService

  async startDataHubLogin(response: Response): Promise<{ authorizeUrl: string }> {
    const oauth = this.config.dataHubOAuth
    const pkce = createPkce()
    const state = randomBytes(24).toString('base64url')
    const stateHash = this.hash(state)
    const expiresAt = new Date(Date.now() + OAUTH_LOGIN_TTL_MS)

    await this.prisma.oauthLogin.create({
      data: {
        stateHash,
        codeVerifier: pkce.verifier,
        expiresAt,
      },
    })

    response.cookie(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
      maxAge: OAUTH_LOGIN_TTL_MS,
    })

    return {
      authorizeUrl: buildAuthorizeUrl(oauth, {
        state,
        codeChallenge: pkce.challenge,
      }),
    }
  }

  async finishDataHubLogin(response: Response, dto: DataHubCallbackDto): Promise<PublicUser> {
    const oauth = this.config.dataHubOAuth
    const stateFromClient = dto.state?.trim() ?? ''
    response.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: '/' })

    if (!stateFromClient) {
      throw apiError(401, '登录状态已失效，请重新登录', 'unauthorized')
    }
    // 以 body/URL 的 state 对照库内 PKCE 记录；Cookie 可能与本次授权不一致（重复点登录、残留上次 Cookie）

    const expectedState = stateFromClient
    const stateHash = this.hash(expectedState)
    const pending = await this.prisma.oauthLogin.findFirst({
      where: { stateHash, expiresAt: { gt: new Date() } },
    })
    if (!pending) {
      throw apiError(401, '登录状态已失效，请重新登录', 'unauthorized')
    }

    const result = await completeDataHubLogin({
      config: oauth,
      accounts: this.createAccountStore(),
      fetch: globalThis.fetch.bind(globalThis),
      input: {
        code: dto.code,
        state: stateFromClient,
        error: dto.error,
        expectedState,
        codeVerifier: pending.codeVerifier,
      },
    })

    await this.prisma.oauthLogin.deleteMany({ where: { stateHash } })

    if (result.kind === 'reject') {
      const status =
        result.message === '手机号重复，请管理员处理' ||
        result.message === '该手机号已绑定其他 data-hub 用户' ||
        result.message === '账号已存在，请联系管理员'
          ? 409
          : 401
      throw apiError(status, result.message, status === 409 ? 'conflict' : 'unauthorized')
    }

    const session = await this.issueSession(result.user.id)
    this.setSessionCookie(response, session.token)
    return this.toPublicUser(result.user)
  }

  async resolveSession(token: string): Promise<AuthUser | null> {
    const tokenHash = this.hash(token)
    const row = await this.prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    })
    if (!row || row.user.delFlag !== 0) {
      return null
    }
    return {
      ...this.toPublicUser(this.toLocalAccount(row.user)),
      sessionId: row.id,
    }
  }

  me(user: AuthUser): PublicUser {
    const { sessionId: _sessionId, ...publicUser } = user
    return publicUser
  }

  async logout(sessionId: string, response: Response): Promise<{ ok: true }> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } })
    response.clearCookie(AUTH_COOKIE_NAME, { path: '/' })
    return { ok: true }
  }

  private createAccountStore(): AccountStore {
    return {
      findByDataHubUserId: async (id) => {
        const row = await this.prisma.user.findFirst({
          where: { dataHubUserId: id, delFlag: 0 },
        })
        return row ? this.toLocalAccount(row) : null
      },
      listByPhone: async (phone) => {
        const rows = await this.prisma.user.findMany({
          where: { phone, delFlag: 0 },
        })
        return rows.map((row) => this.toLocalAccount(row))
      },
      bindDataHubUser: async (userId, dataHubUserId) => {
        const updated = await this.prisma.user.updateMany({
          where: { id: userId, delFlag: 0, dataHubUserId: null },
          data: { dataHubUserId },
        })
        if (updated.count === 0) {
          return null
        }
        const row = await this.prisma.user.findFirst({
          where: { id: userId, delFlag: 0 },
        })
        return row ? this.toLocalAccount(row) : null
      },
      createUser: async (input) => {
        try {
          const row = await this.prisma.user.create({
            data: {
              phone: input.phone,
              displayName: input.displayName,
              dataHubUserId: input.dataHubUserId,
              role: input.role,
            },
          })
          return this.toLocalAccount(row)
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new AccountConflictError()
          }
          throw error
        }
      },
    }
  }

  private async issueSession(userId: string): Promise<{ token: string; sessionId: string }> {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + this.config.webSessionTtlSeconds * 1000)
    const row = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        expiresAt,
      },
    })
    return { token, sessionId: row.id }
  }

  private setSessionCookie(response: Response, token: string): void {
    response.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
      maxAge: this.config.webSessionTtlSeconds * 1000,
    })
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private toLocalAccount(user: User): LocalAccount {
    return {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      dataHubUserId: user.dataHubUserId,
      role: user.role,
    }
  }

  private toPublicUser(account: LocalAccount): PublicUser {
    return {
      id: account.id,
      phone: account.phone,
      displayName: account.displayName,
      role: account.role,
      dataHubUserId: account.dataHubUserId,
    }
  }
}
