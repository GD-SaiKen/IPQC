import { describe, expect, it } from 'vitest'

import { decideIdentity, normalizePhone } from '../../../modules/auth/identity'

const hub = {
  id: 'hub-1',
  loginName: '138-0013-8000',
  displayName: '张三',
  status: 'active',
  role: 'admin',
}

describe('normalizePhone', () => {
  it('去掉空格和横线后保留 11 位数字', () => {
    expect(normalizePhone('138-0013-8000')).toBe('13800138000')
    expect(normalizePhone('138 0013 8000')).toBe('13800138000')
  })

  it('不是 11 位数字时返回空', () => {
    expect(normalizePhone('1380013800')).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
  })
})

describe('decideIdentity', () => {
  it('data-hub 用户已停用时拒绝，即使本地已绑定', () => {
    const decision = decideIdentity({
      hub: { ...hub, status: 'disabled' },
      bound: {
        id: 'local-1',
        phone: '13800138000',
        displayName: '张三',
        dataHubUserId: 'hub-1',
        role: 'user',
      },
      phoneMatches: [],
    })
    expect(decision).toEqual({ kind: 'reject', message: '账号已停用' })
  })

  it('登录名不是 11 位手机号时拒绝，不自动开户', () => {
    const decision = decideIdentity({
      hub: { ...hub, loginName: 'zhangsan' },
      bound: null,
      phoneMatches: [],
    })
    expect(decision).toEqual({ kind: 'reject', message: '登录名不是 11 位手机号' })
  })

  it('已绑定该 data-hub 用户时直接登录，不再用手机号重对', () => {
    const decision = decideIdentity({
      hub: { ...hub, loginName: '13900000000' },
      bound: {
        id: 'local-1',
        phone: '13800138000',
        displayName: '旧名字',
        dataHubUserId: 'hub-1',
        role: 'inspector',
      },
      phoneMatches: [
        {
          id: 'local-1',
          phone: '13800138000',
          displayName: '旧名字',
          dataHubUserId: 'hub-1',
          role: 'inspector',
        },
        {
          id: 'local-2',
          phone: '13800138000',
          displayName: '重复',
          dataHubUserId: null,
          role: 'user',
        },
      ],
    })
    expect(decision).toEqual({ kind: 'login', userId: 'local-1' })
  })

  it('手机号唯一且未绑定时写入绑定', () => {
    const decision = decideIdentity({
      hub,
      bound: null,
      phoneMatches: [
        {
          id: 'local-9',
          phone: '13800138000',
          displayName: '已有用户',
          dataHubUserId: null,
          role: 'user',
        },
      ],
    })
    expect(decision).toEqual({ kind: 'bind', userId: 'local-9' })
  })

  it('同一手机号有多条本地用户时拒绝', () => {
    const decision = decideIdentity({
      hub,
      bound: null,
      phoneMatches: [
        {
          id: 'a',
          phone: '13800138000',
          displayName: '甲',
          dataHubUserId: null,
          role: 'user',
        },
        {
          id: 'b',
          phone: '13800138000',
          displayName: '乙',
          dataHubUserId: null,
          role: 'user',
        },
      ],
    })
    expect(decision).toEqual({ kind: 'reject', message: '手机号重复，请管理员处理' })
  })

  it('手机号已绑定另一个 data-hub 用户时拒绝且不覆盖', () => {
    const decision = decideIdentity({
      hub,
      bound: null,
      phoneMatches: [
        {
          id: 'local-3',
          phone: '13800138000',
          displayName: '李四',
          dataHubUserId: 'hub-other',
          role: 'user',
        },
      ],
    })
    expect(decision).toEqual({ kind: 'reject', message: '该手机号已绑定其他 data-hub 用户' })
  })

  it('没有对上的手机号时新建本地用户，角色用本系统默认角色', () => {
    const decision = decideIdentity({
      hub,
      bound: null,
      phoneMatches: [],
    })
    expect(decision).toEqual({
      kind: 'create',
      phone: '13800138000',
      displayName: '张三',
      dataHubUserId: 'hub-1',
      role: 'user',
    })
  })
})
