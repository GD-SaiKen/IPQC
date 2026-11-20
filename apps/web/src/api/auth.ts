import type { AuthUser } from '@/types/auth'
import { request } from '@/utils/request'

const AUTH = '/auth'

export function login(payload: { phone: string; password: string }): Promise<AuthUser> {
  return request.post(`${AUTH}/login`, payload, {
    requestOptions: { showSuccess: false, showError: true, sessionExpiredOn401: false },
  })
}

export function getCurrentUser(): Promise<AuthUser> {
  return request.get(`${AUTH}/me`)
}

export function logout(): Promise<{ ok: true }> {
  return request.post(`${AUTH}/logout`)
}

export function getDataHubLinkStatus(): Promise<{ linked: boolean; dataHubUserId: string | null }> {
  return request.get(`${AUTH}/data-hub/link`)
}

export function startDataHubLink(): Promise<{ authorizeUrl: string }> {
  return request.post(`${AUTH}/data-hub/link/start`, undefined, {
    requestOptions: { showError: true, sessionExpiredOn401: true },
  })
}

export function finishDataHubLink(payload: {
  code?: string
  state?: string
  error?: string
}): Promise<{ linked: true; dataHubUserId: string | null }> {
  return request.post(`${AUTH}/data-hub/link/callback`, payload, {
    requestOptions: { showSuccess: false, showError: true, sessionExpiredOn401: true },
  })
}