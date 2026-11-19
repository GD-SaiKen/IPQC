import { describe, expect, it } from 'vitest'

import { getAvatarChar, getDisplayRole } from '@/layouts/default-layout/user-menu'

describe('default-layout 用户菜单', () => {
  it('使用账号名称去除首尾空白后的首字作为头像，空账号显示未', () => {
    expect(getAvatarChar({ displayName: ' 张三 ' })).toBe('张')
    expect(getAvatarChar({ displayName: '   ' })).toBe('未')
    expect(getAvatarChar(null)).toBe('未')
  })

  it('按角色显示中文角色名称', () => {
    expect(getDisplayRole('admin')).toBe('管理员')
    expect(getDisplayRole('user')).toBe('普通用户')
  })
})
