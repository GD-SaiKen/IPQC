import { Injectable } from '@nestjs/common'
import type { OnModuleInit } from '@nestjs/common'

import type { DataHubOAuthConfig } from '../../modules/auth/data-hub-config'
import { decodeTokenKey } from '../../modules/auth/token-cipher'

function readPositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback
  }
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 必须是正整数`)
  }
  return value
}

@Injectable()
export class RuntimeConfigService implements OnModuleInit {
  private readonly env = process.env

  onModuleInit(): void {
    void this.databaseUrl
    void this.port
  }

  get databaseUrl(): string {
    const value = this.env.DATABASE_URL?.trim()
    if (!value) {
      throw new Error('缺少环境变量 DATABASE_URL')
    }
    return value
  }

  get port(): number {
    return readPositiveInt(this.env.PORT, 3006, 'PORT')
  }

  get webSessionTtlSeconds(): number {
    return readPositiveInt(this.env.AUTH_WEB_SESSION_TTL_SECONDS, 28800, 'AUTH_WEB_SESSION_TTL_SECONDS')
  }

  get cookieSecure(): boolean {
    return this.env.AUTH_COOKIE_SECURE === 'true'
  }

  get bootstrapPhone(): string | null {
    const raw = this.env.AUTH_BOOTSTRAP_PHONE?.trim()
    return raw ? raw : null
  }

  get bootstrapPassword(): string | null {
    const raw = this.env.AUTH_BOOTSTRAP_PASSWORD?.trim()
    return raw ? raw : null
  }

  get bootstrapDisplayName(): string {
    return this.env.AUTH_BOOTSTRAP_DISPLAY_NAME?.trim() || '管理员'
  }

  get bootstrapRole(): string {
    const raw = this.env.AUTH_BOOTSTRAP_ROLE?.trim()
    return raw || 'admin'
  }

  get dataHubTokenKey(): Buffer {
    const raw = this.env.DATA_HUB_TOKEN_KEY?.trim()
    if (!raw) {
      throw new Error('缺少环境变量 DATA_HUB_TOKEN_KEY（共享盘同步需要）')
    }
    return decodeTokenKey(raw)
  }

  get dataHubOAuth(): DataHubOAuthConfig {
    const authorizeOrigin = this.env.DATA_HUB_PUBLIC_ORIGIN?.trim()
    const apiOrigin = this.env.DATA_HUB_API_ORIGIN?.trim()
    const clientId = this.env.DATA_HUB_OAUTH_CLIENT_ID?.trim()
    const resource = this.env.DATA_HUB_OAUTH_RESOURCE?.trim()
    const redirectUri = this.env.IPQC_DATA_HUB_REDIRECT_URI?.trim() ?? this.env.IPQC_OAUTH_REDIRECT_URI?.trim()
    if (!apiOrigin) {
      throw new Error('缺少环境变量 DATA_HUB_API_ORIGIN（共享盘同步需要）')
    }
    if (!clientId) {
      throw new Error('缺少环境变量 DATA_HUB_OAUTH_CLIENT_ID（共享盘同步需要）')
    }
    if (!redirectUri) {
      throw new Error('缺少环境变量 IPQC_DATA_HUB_REDIRECT_URI（共享盘授权回调）')
    }
    return {
      authorizeOrigin: (authorizeOrigin ?? apiOrigin).replace(/\/$/, ''),
      apiOrigin: apiOrigin.replace(/\/$/, ''),
      clientId,
      clientSecret: this.env.DATA_HUB_OAUTH_CLIENT_SECRET?.trim() ?? '',
      resource: resource ?? `${apiOrigin.replace(/\/$/, '')}/mcp`,
      redirectUri,
    }
  }
}