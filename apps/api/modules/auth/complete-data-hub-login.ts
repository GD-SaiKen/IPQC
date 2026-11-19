import type { DataHubOAuthConfig } from './data-hub-config'
import { decideIdentity, normalizePhone, type HubIdentity, type LocalAccount } from './identity'

export class AccountConflictError extends Error {
  constructor() {
    super('账号已存在，请联系管理员')
  }
}

export interface AccountStore {
  findByDataHubUserId(id: string): Promise<LocalAccount | null>
  listByPhone(phone: string): Promise<LocalAccount[]>
  bindDataHubUser(userId: string, dataHubUserId: string): Promise<LocalAccount | null>
  createUser(input: {
    phone: string
    displayName: string
    dataHubUserId: string
    role: 'user'
  }): Promise<LocalAccount>
}

export interface DataHubCallbackInput {
  code?: string
  state?: string
  error?: string
  expectedState: string
  codeVerifier: string
}

export type DataHubLoginResult =
  | { kind: 'reject'; message: string }
  | { kind: 'login'; user: LocalAccount }

/**
 * 用授权码换票并调用 `/api/v1/auth/me`，按认人规则登录。
 * 返回值只含本地用户，不保留 data-hub 访问令牌和刷新令牌。
 */
export async function completeDataHubLogin(args: {
  config: DataHubOAuthConfig
  accounts: AccountStore
  fetch: typeof fetch
  input: DataHubCallbackInput
}): Promise<DataHubLoginResult> {
  if (args.input.error) {
    return {
      kind: 'reject',
      message: args.input.error === 'access_denied' ? '已取消授权' : '授权失败',
    }
  }
  if (!args.input.code || !args.input.state || args.input.state !== args.input.expectedState) {
    return { kind: 'reject', message: '登录状态已失效，请重新登录' }
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.input.code,
    redirect_uri: args.config.redirectUri,
    client_id: args.config.clientId,
    code_verifier: args.input.codeVerifier,
  })
  if (args.config.clientSecret) {
    body.set('client_secret', args.config.clientSecret)
  }

  const tokenResponse = await args.fetch(new URL('/oauth/token', args.config.apiOrigin), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const tokenPayload = (await tokenResponse.json()) as {
    error_description?: string
    access_token?: string
  }
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    return {
      kind: 'reject',
      message: tokenPayload.error_description || '授权失败',
    }
  }

  const accessToken = tokenPayload.access_token
  const meResponse = await args.fetch(new URL('/api/v1/auth/me', args.config.apiOrigin), {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const mePayload = (await meResponse.json()) as { data?: HubIdentity; message?: string }
  if (!meResponse.ok || !mePayload.data?.id) {
    return { kind: 'reject', message: mePayload.message || '无法确认 data-hub 身份' }
  }

  const hub = mePayload.data
  const phone = normalizePhone(hub.loginName ?? '')
  const bound = await args.accounts.findByDataHubUserId(hub.id)
  const phoneMatches = phone ? await args.accounts.listByPhone(phone) : []
  const decision = decideIdentity({
    hub: {
      id: hub.id,
      loginName: hub.loginName ?? '',
      displayName: hub.displayName ?? '',
      status: hub.status ?? '',
      role: hub.role ?? '',
    },
    bound,
    phoneMatches,
  })

  if (decision.kind === 'reject') {
    return decision
  }
  if (decision.kind === 'login') {
    if (!bound || bound.id !== decision.userId) {
      return { kind: 'reject', message: '无法确认 data-hub 身份' }
    }
    return { kind: 'login', user: bound }
  }
  if (decision.kind === 'bind') {
    const user = await args.accounts.bindDataHubUser(decision.userId, hub.id)
    if (!user) {
      return { kind: 'reject', message: '该手机号已绑定其他 data-hub 用户' }
    }
    return { kind: 'login', user }
  }

  try {
    const user = await args.accounts.createUser({
      phone: decision.phone,
      displayName: decision.displayName,
      dataHubUserId: decision.dataHubUserId,
      role: decision.role,
    })
    return { kind: 'login', user }
  } catch (error) {
    if (error instanceof AccountConflictError) {
      return { kind: 'reject', message: '账号已存在，请联系管理员' }
    }
    throw error
  }
}
