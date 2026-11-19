import { createHash, randomBytes } from 'node:crypto'

import type { DataHubOAuthConfig } from './data-hub-config'

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthorizeUrl(
  config: Pick<DataHubOAuthConfig, 'authorizeOrigin' | 'clientId' | 'redirectUri' | 'resource'>,
  input: { state: string; codeChallenge: string },
): string {
  const url = new URL('/oauth/authorize', config.authorizeOrigin)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', 'mcp:read')
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('resource', config.resource)
  return url.toString()
}
