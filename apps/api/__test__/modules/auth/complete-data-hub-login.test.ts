import { describe, expect, it } from 'vitest'

import type { LocalAccount } from '../../../modules/auth/identity'
import {
  AccountConflictError,
  completeDataHubLogin,
  type AccountStore,
} from '../../../modules/auth/complete-data-hub-login'
import { buildAuthorizeUrl, createPkce } from '../../../modules/auth/pkce'

const redirectUri = 'http://localhost:5176/login/callback'
const config = {
  authorizeOrigin: 'http://localhost:5175',
  apiOrigin: 'http://localhost:3005',
  clientId: 'ipqc-client',
  clientSecret: '',
  resource: 'http://localhost:3005/mcp',
  redirectUri,
}

function account(partial: Partial<LocalAccount> & Pick<LocalAccount, 'id'>): LocalAccount {
  return {
    phone: '13800138000',
    displayName: '张三',
    dataHubUserId: null,
    role: 'user',
    ...partial,
  }
}

describe('buildAuthorizeUrl', () => {
  it('带上授权码、PKCE 与 mcp:read，不包含口令', () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        state: 'state-1',
        codeChallenge: 'challenge-1',
      }),
    )
    expect(url.origin + url.pathname).toBe('http://localhost:5175/oauth/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('ipqc-client')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(url.searchParams.get('scope')).toBe('mcp:read')
    expect(url.searchParams.get('state')).toBe('state-1')
    expect(url.searchParams.get('code_challenge')).toBe('challenge-1')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('resource')).toBe('http://localhost:3005/mcp')
    expect(url.search).not.toContain('password')
  })
})

describe('createPkce', () => {
  it('challenge 是 verifier 的 S256', () => {
    const pkce = createPkce()
    expect(pkce.verifier.length).toBeGreaterThan(20)
    expect(pkce.challenge).not.toBe(pkce.verifier)
    expect(pkce.challenge).not.toContain('+')
    expect(pkce.challenge).not.toContain('=')
  })
})

describe('completeDataHubLogin', () => {
  it('用户拒绝授权时不建用户、不换票', async () => {
    const calls: string[] = []
    const store = memoryStore()
    const result = await completeDataHubLogin({
      config,
      accounts: store,
      fetch: async (url) => {
        calls.push(String(url))
        throw new Error('不应请求 data-hub')
      },
      input: { error: 'access_denied', state: 'state-1', expectedState: 'state-1', codeVerifier: 'v' },
    })
    expect(result).toEqual({ kind: 'reject', message: '已取消授权' })
    expect(calls).toEqual([])
    expect(store.created).toEqual([])
  })

  it('state 不一致时不换票', async () => {
    const calls: string[] = []
    const result = await completeDataHubLogin({
      config,
      accounts: memoryStore(),
      fetch: async (url) => {
        calls.push(String(url))
        throw new Error('不应请求 data-hub')
      },
      input: { code: 'code-1', state: 'other', expectedState: 'state-1', codeVerifier: 'v' },
    })
    expect(result.kind).toBe('reject')
    expect(calls).toEqual([])
  })

  it('换票失败时不建用户', async () => {
    const store = memoryStore()
    const result = await completeDataHubLogin({
      config,
      accounts: store,
      fetch: async () =>
        new Response(JSON.stringify({ error: 'invalid_grant', error_description: '授权码无效或已过期' }), {
          status: 400,
        }),
      input: { code: 'code-1', state: 'state-1', expectedState: 'state-1', codeVerifier: 'verifier' },
    })
    expect(result).toEqual({ kind: 'reject', message: '授权码无效或已过期' })
    expect(store.created).toEqual([])
  })

  it('首次登录按手机号绑定已有用户，并丢弃 data-hub 令牌', async () => {
    const store = memoryStore([account({ id: 'local-9', dataHubUserId: null })])
    const result = await completeDataHubLogin({
      config,
      accounts: store,
      fetch: mockHub({ accessToken: 'access-secret', refreshToken: 'refresh-secret' }),
      input: { code: 'code-1', state: 'state-1', expectedState: 'state-1', codeVerifier: 'verifier' },
    })
    expect(result).toEqual({
      kind: 'login',
      user: {
        id: 'local-9',
        phone: '13800138000',
        displayName: '张三',
        dataHubUserId: 'hub-1',
        role: 'user',
      },
    })
    expect(store.bound).toEqual([{ userId: 'local-9', dataHubUserId: 'hub-1' }])
    expect(JSON.stringify(result)).not.toContain('access-secret')
  })

  it('没有本地用户时开户，角色是 user', async () => {
    const store = memoryStore()
    const result = await completeDataHubLogin({
      config,
      accounts: store,
      fetch: mockHub({ accessToken: 'access-secret', refreshToken: 'refresh-secret' }),
      input: { code: 'code-1', state: 'state-1', expectedState: 'state-1', codeVerifier: 'verifier' },
    })
    expect(result.kind).toBe('login')
    if (result.kind !== 'login') {
      return
    }
    expect(result.user.role).toBe('user')
    expect(result.user.dataHubUserId).toBe('hub-1')
    expect(JSON.stringify(result)).not.toContain('access-secret')
  })

  it('开户撞上唯一约束时拒绝，不插入第二条', async () => {
    const store = memoryStore()
    store.createUser = async () => {
      throw new AccountConflictError()
    }
    const result = await completeDataHubLogin({
      config,
      accounts: store,
      fetch: mockHub({ accessToken: 'access-secret', refreshToken: 'refresh-secret' }),
      input: { code: 'code-1', state: 'state-1', expectedState: 'state-1', codeVerifier: 'verifier' },
    })
    expect(result).toEqual({ kind: 'reject', message: '账号已存在，请联系管理员' })
  })
})

function memoryStore(seed: LocalAccount[] = []): AccountStore & {
  created: LocalAccount[]
  bound: Array<{ userId: string; dataHubUserId: string }>
} {
  const rows = seed.map((row) => ({ ...row }))
  const created: LocalAccount[] = []
  const bound: Array<{ userId: string; dataHubUserId: string }> = []
  return {
    created,
    bound,
    async findByDataHubUserId(id) {
      return rows.find((row) => row.dataHubUserId === id) ?? null
    },
    async listByPhone(phone) {
      return rows.filter((row) => row.phone === phone)
    },
    async bindDataHubUser(userId, dataHubUserId) {
      const row = rows.find((item) => item.id === userId && item.dataHubUserId === null)
      if (!row) {
        return null
      }
      row.dataHubUserId = dataHubUserId
      bound.push({ userId, dataHubUserId })
      return { ...row }
    },
    async createUser(input) {
      const row: LocalAccount = { id: `new-${rows.length + 1}`, ...input }
      rows.push(row)
      created.push(row)
      return { ...row }
    },
  }
}

function mockHub(tokens: { accessToken: string; refreshToken: string }): typeof fetch {
  return async (url, init) => {
    const href = String(url)
    const body = typeof init?.body === 'string' ? init.body : ''
    if (href.endsWith('/oauth/token')) {
      expect(body).toContain('grant_type=authorization_code')
      expect(body).toContain('code=code-1')
      expect(body).not.toContain('password')
      return new Response(
        JSON.stringify({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'mcp:read',
        }),
        { status: 200 },
      )
    }
    const header = new Headers(init?.headers).get('authorization')
    expect(header).toBe(`Bearer ${tokens.accessToken}`)
    return new Response(
      JSON.stringify({
        code: 200,
        data: {
          id: 'hub-1',
          loginName: '138-0013-8000',
          displayName: '张三',
          role: 'admin',
          status: 'active',
        },
        msg: 'success',
        message: '操作成功',
      }),
      { status: 200 },
    )
  }
}
