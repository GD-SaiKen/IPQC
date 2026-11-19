/** 对接项目自动开户时使用的角色，不沿用 data-hub 的 admin/user。 */
export const DEFAULT_LOCAL_ROLE = 'user' as const

export interface HubIdentity {
  id: string
  loginName: string
  displayName: string
  status: string
  role: string
}

export interface LocalAccount {
  id: string
  phone: string
  displayName: string
  dataHubUserId: string | null
  role: string
}

export type IdentityDecision =
  | { kind: 'login'; userId: string }
  | { kind: 'bind'; userId: string }
  | {
      kind: 'create'
      phone: string
      displayName: string
      dataHubUserId: string
      role: typeof DEFAULT_LOCAL_ROLE
    }
  | { kind: 'reject'; message: string }

/**
 * 去掉空格和横线。结果必须是 11 位数字。
 */
export function normalizePhone(loginName: string): string | null {
  const compact = loginName.replace(/[\s-]/g, '')
  return /^\d{11}$/.test(compact) ? compact : null
}

/**
 * 按统一身份规格第 4 节决定登录、绑定、开户或拒绝。
 * 已绑定 `dataHubUserId` 时不再用手机号重对。
 */
export function decideIdentity(input: {
  hub: HubIdentity
  bound: LocalAccount | null
  phoneMatches: LocalAccount[]
}): IdentityDecision {
  if (input.hub.status !== 'active') {
    return { kind: 'reject', message: '账号已停用' }
  }

  const phone = normalizePhone(input.hub.loginName)
  if (!phone) {
    return { kind: 'reject', message: '登录名不是 11 位手机号' }
  }

  if (input.bound) {
    return { kind: 'login', userId: input.bound.id }
  }

  if (input.phoneMatches.length > 1) {
    return { kind: 'reject', message: '手机号重复，请管理员处理' }
  }

  const matched = input.phoneMatches[0]
  if (matched?.dataHubUserId && matched.dataHubUserId !== input.hub.id) {
    return { kind: 'reject', message: '该手机号已绑定其他 data-hub 用户' }
  }

  if (matched && !matched.dataHubUserId) {
    return { kind: 'bind', userId: matched.id }
  }

  return {
    kind: 'create',
    phone,
    displayName: input.hub.displayName,
    dataHubUserId: input.hub.id,
    role: DEFAULT_LOCAL_ROLE,
  }
}
