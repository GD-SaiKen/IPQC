import { createHash, randomBytes } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import type { User } from '@prisma/client'
import type { Response } from 'express'

import { apiError, API_MSG, PrismaService, RuntimeConfigService } from '../../common'

import type { LoginDto } from './dto/login.dto'
import { normalizePhone } from './identity'
import type { LocalAccount } from './identity'
import type { AuthUser, PublicUser } from './auth.types'
import { AUTH_COOKIE_NAME, OAUTH_LOGIN_TTL_MS } from './auth.constants'
import { exchangeAuthorizationCode, fetchDataHubMe, refreshAccessToken } from './data-hub-oauth'
import type { DataHubLinkCallbackDto } from './dto/data-hub-link-callback.dto'
import { decryptToken, encryptToken } from './token-cipher'
import { buildAuthorizeUrl, createPkce } from './pkce'
import { hashPassword, verifyPassword } from './password'

@Injectable()
export class AuthService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService

  @Inject(RuntimeConfigService)
  private readonly config!: RuntimeConfigService

  async loginWithPassword(response: Response, dto: LoginDto): Promise<PublicUser> {
    const phone = normalizePhone(dto.phone)
    if (!phone) {
      throw apiError(401, '手机号或密码错误', 'unauthorized')
    }

    let user = await this.prisma.user.findFirst({
      where: { phone, delFlag: 0 },
    })
    if (!user) {
      user = await this.tryBootstrapUser(phone, dto.password)
    } else if (!user.passwordHash) {
      user = (await this.tryBootstrapUser(phone, dto.password)) ?? user
    }
    if (!user?.passwordHash) {
      throw apiError(401, '手机号或密码错误', 'unauthorized')
    }

    const ok = await verifyPassword(dto.password, user.passwordHash)
    if (!ok) {
      throw apiError(401, '手机号或密码错误', 'unauthorized')
    }

    const session = await this.issueSession(user.id)
    this.setSessionCookie(response, session.token)
    return this.toPublicUser(this.toLocalAccount(user))
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

  async hasDataHubLink(userId: string): Promise<{ linked: boolean; dataHubUserId: string | null }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, delFlag: 0 },
      select: {
        dataHubUserId: true,
        dataHubRefreshCiphertext: true,
        dataHubRefreshNonce: true,
        dataHubRefreshKeyVersion: true,
      },
    })
    const linked = Boolean(
      user?.dataHubRefreshCiphertext && user.dataHubRefreshNonce && user.dataHubRefreshKeyVersion != null,
    )
    return { linked, dataHubUserId: user?.dataHubUserId ?? null }
  }

  async startDataHubLink(): Promise<{ authorizeUrl: string }> {
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

    return {
      authorizeUrl: buildAuthorizeUrl(oauth, {
        state,
        codeChallenge: pkce.challenge,
      }),
    }
  }

  async finishDataHubLink(
    userId: string,
    dto: DataHubLinkCallbackDto,
  ): Promise<{ linked: true; dataHubUserId: string | null }> {
    if (dto.error?.trim()) {
      throw apiError(401, '已取消授权', 'unauthorized')
    }
    const code = dto.code?.trim()
    const stateFromClient = dto.state?.trim() ?? ''
    if (!code || !stateFromClient) {
      throw apiError(401, '授权未完成，请重试', 'unauthorized')
    }

    const stateHash = this.hash(stateFromClient)
    const pending = await this.prisma.oauthLogin.findFirst({
      where: { stateHash, expiresAt: { gt: new Date() } },
    })
    if (!pending) {
      throw apiError(401, '授权状态已失效，请重试', 'unauthorized')
    }

    const oauth = this.config.dataHubOAuth
    let tokens: { accessToken: string; refreshToken?: string }
    try {
      tokens = await exchangeAuthorizationCode(
        oauth,
        { code, codeVerifier: pending.codeVerifier },
        globalThis.fetch.bind(globalThis),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '授权码换票失败'
      throw apiError(401, message, 'unauthorized')
    } finally {
      await this.prisma.oauthLogin.deleteMany({ where: { stateHash } })
    }

    const me = await fetchDataHubMe(oauth.apiOrigin, tokens.accessToken, globalThis.fetch.bind(globalThis))
    if (!me.id || me.status !== 'active') {
      throw apiError(401, 'data-hub 账号不可用', 'unauthorized')
    }

    const current = await this.prisma.user.findFirst({ where: { id: userId, delFlag: 0 } })
    if (!current) {
      throw apiError(401, '请先登录', 'unauthorized')
    }
    const occupied = await this.prisma.user.findFirst({
      where: { dataHubUserId: me.id, delFlag: 0, id: { not: userId } },
    })
    if (occupied) {
      throw apiError(409, '该 data-hub 账号已绑定其他 IPQC 用户', 'conflict')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { dataHubUserId: me.id },
    })
    if (tokens.refreshToken) {
      await this.saveRefreshToken(userId, tokens.refreshToken)
    } else {
      throw apiError(401, 'data-hub 未返回刷新令牌', 'unauthorized')
    }

    return { linked: true, dataHubUserId: me.id }
  }

  async unlinkDataHubLink(userId: string): Promise<{ linked: false }> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, delFlag: 0 } })
    if (!user) {
      throw apiError(401, '请先登录', 'unauthorized')
    }
    await this.clearRefreshToken(userId)
    return { linked: false }
  }

  async getDataHubAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, delFlag: 0 },
    })
    if (
      !user?.dataHubRefreshCiphertext ||
      !user.dataHubRefreshNonce ||
      user.dataHubRefreshKeyVersion == null
    ) {
      throw apiError(401, '尚未授权 data-hub 共享盘访问', API_MSG.dataHubUnauthorized)
    }
    const plain = decryptToken(
      {
        ciphertext: user.dataHubRefreshCiphertext,
        nonce: user.dataHubRefreshNonce,
        keyVersion: user.dataHubRefreshKeyVersion,
      },
      this.config.dataHubTokenKey,
    )
    return this.refreshDataHubAccessToken(userId, plain)
  }

  private async refreshDataHubAccessToken(userId: string, refreshToken: string): Promise<string> {
    const oauth = this.config.dataHubOAuth
    try {
      const tokens = await refreshAccessToken(oauth, refreshToken, globalThis.fetch.bind(globalThis))
      if (tokens.refreshToken) {
        await this.saveRefreshToken(userId, tokens.refreshToken)
      }
      return tokens.accessToken
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const permanentFailure =
        /invalid_grant|invalid_token|refresh_token|刷新令牌无效|已过期/i.test(message)
      if (permanentFailure) {
        await this.clearRefreshToken(userId)
      }
      throw apiError(401, 'data-hub 授权已失效，请重新连接', API_MSG.dataHubUnauthorized)
    }
  }

  private async clearRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        dataHubRefreshCiphertext: null,
        dataHubRefreshNonce: null,
        dataHubRefreshKeyVersion: null,
      },
    })
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const encrypted = encryptToken(refreshToken, this.config.dataHubTokenKey)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        dataHubRefreshCiphertext: encrypted.ciphertext,
        dataHubRefreshNonce: encrypted.nonce,
        dataHubRefreshKeyVersion: encrypted.keyVersion,
      },
    })
  }

  private async tryBootstrapUser(phone: string, password: string): Promise<User | null> {
    const bootPhone = this.config.bootstrapPhone
    const bootPassword = this.config.bootstrapPassword
    if (!bootPhone || !bootPassword) {
      return null
    }
    const normalizedBoot = normalizePhone(bootPhone)
    if (!normalizedBoot || normalizedBoot !== phone || password !== bootPassword) {
      return null
    }
    const passwordHash = await hashPassword(bootPassword)
    const existing = await this.prisma.user.findFirst({ where: { phone, delFlag: 0 } })
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          displayName: this.config.bootstrapDisplayName,
          role: this.config.bootstrapRole,
        },
      })
    }
    return this.prisma.user.create({
      data: {
        phone,
        displayName: this.config.bootstrapDisplayName,
        passwordHash,
        role: this.config.bootstrapRole,
      },
    })
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