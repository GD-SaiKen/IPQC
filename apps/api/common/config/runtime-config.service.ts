import { Injectable } from '@nestjs/common'
import type { OnModuleInit } from '@nestjs/common'

import type { DataHubOAuthConfig } from '../../modules/auth/data-hub-config'

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
    void this.dataHubOAuth
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

  get dataHubOAuth(): DataHubOAuthConfig {
    const authorizeOrigin = this.env.DATA_HUB_PUBLIC_ORIGIN?.trim()
    const apiOrigin = this.env.DATA_HUB_API_ORIGIN?.trim()
    const clientId = this.env.DATA_HUB_OAUTH_CLIENT_ID?.trim()
    const resource = this.env.DATA_HUB_OAUTH_RESOURCE?.trim()
    const redirectUri = this.env.IPQC_OAUTH_REDIRECT_URI?.trim()
    if (!authorizeOrigin) {
      throw new Error('缺少环境变量 DATA_HUB_PUBLIC_ORIGIN')
    }
    if (!apiOrigin) {
      throw new Error('缺少环境变量 DATA_HUB_API_ORIGIN')
    }
    if (!clientId) {
      throw new Error('缺少环境变量 DATA_HUB_OAUTH_CLIENT_ID')
    }
    if (!resource) {
      throw new Error('缺少环境变量 DATA_HUB_OAUTH_RESOURCE')
    }
    if (!redirectUri) {
      throw new Error('缺少环境变量 IPQC_OAUTH_REDIRECT_URI')
    }
    return {
      authorizeOrigin: authorizeOrigin.replace(/\/$/, ''),
      apiOrigin: apiOrigin.replace(/\/$/, ''),
      clientId,
      clientSecret: this.env.DATA_HUB_OAUTH_CLIENT_SECRET?.trim() ?? '',
      resource,
      redirectUri,
    }
  }
}
