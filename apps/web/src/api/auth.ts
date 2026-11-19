import type { AuthUser } from '@/types/auth'
import { request } from '@/utils/request'

const AUTH = '/v1/auth'

export function startDataHubLogin(): Promise<{ authorizeUrl: string }> {
  return request.post(`${AUTH}/data-hub/start`, undefined, {
    requestOptions: { showError: true, sessionExpiredOn401: false },
  })
}

export function finishDataHubLogin(payload: {
  code?: string
  state?: string
  error?: string
}): Promise<AuthUser> {
  return request.post(`${AUTH}/data-hub/callback`, payload, {
    requestOptions: { showSuccess: false, showError: true, sessionExpiredOn401: false },
  })
}

export function getCurrentUser(): Promise<AuthUser> {
  return request.get(`${AUTH}/me`)
}

export function logout(): Promise<{ ok: true }> {
  return request.post(`${AUTH}/logout`)
}
