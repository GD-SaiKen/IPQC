import type { DataHubOAuthConfig } from './data-hub-config'

export interface DataHubMe {
  id: string
  loginName?: string
  displayName?: string
  role?: string
  status?: string
}

export interface DataHubTokenResult {
  accessToken: string
  refreshToken?: string
}

interface OAuthTokenPayload {
  access_token?: string
  refresh_token?: string
  error?: string
  error_description?: string
}

export function parseOAuthTokenPayload(body: unknown): OAuthTokenPayload {
  if (body && typeof body === 'object' && 'data' in body) {
    const data = (body as { data: unknown }).data
    if (data && typeof data === 'object') {
      return data as OAuthTokenPayload
    }
  }
  return (body ?? {}) as OAuthTokenPayload
}

export async function refreshAccessToken(
  config: DataHubOAuthConfig,
  refreshToken: string,
  fetchFn: typeof fetch,
): Promise<DataHubTokenResult> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  })
  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret)
  }
  const response = await fetchFn(new URL('/oauth/token', config.apiOrigin), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const json = await response.json()
  const payload = parseOAuthTokenPayload(json)
  if (!response.ok || !payload.access_token) {
    const message = payload.error_description ?? payload.error ?? '刷新令牌无效或已过期'
    throw new Error(message)
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  }
}

export async function exchangeAuthorizationCode(
  config: DataHubOAuthConfig,
  input: { code: string; codeVerifier: string },
  fetchFn: typeof fetch,
): Promise<DataHubTokenResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: input.codeVerifier,
  })
  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret)
  }
  const response = await fetchFn(new URL('/oauth/token', config.apiOrigin), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const payload = parseOAuthTokenPayload(await response.json())
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? '授权码换票失败')
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  }
}

function parseEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

export async function fetchDataHubMe(
  apiOrigin: string,
  accessToken: string,
  fetchFn: typeof fetch,
): Promise<DataHubMe> {
  const response = await fetchFn(new URL('/api/auth/me', apiOrigin), {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const body = await response.json()
  if (!response.ok) {
    const record = body as { message?: string }
    throw new Error(record.message ?? '无法确认 data-hub 身份')
  }
  return parseEnvelope<DataHubMe>(body)
}