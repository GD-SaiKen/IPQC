export interface PublicUser {
  id: string
  phone: string
  displayName: string
  role: string
  dataHubUserId: string | null
}

export interface AuthUser extends PublicUser {
  sessionId: string
}
