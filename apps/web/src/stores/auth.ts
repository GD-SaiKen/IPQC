import { reactive } from 'vue'

import type { AuthUser } from '@/types/auth'

export const authState = reactive<{ user: AuthUser | null; loaded: boolean }>({
  user: null,
  loaded: false,
})

let expiredHandler: (() => void) | undefined

export function setAuthUser(user: AuthUser | null): void {
  authState.user = user
  authState.loaded = true
}

export function onSessionExpired(handler: () => void): void {
  expiredHandler = handler
}

export function notifySessionExpired(): void {
  setAuthUser(null)
  expiredHandler?.()
}
