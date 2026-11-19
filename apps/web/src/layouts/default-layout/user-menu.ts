/**
 * @file 顶栏用户菜单辅助函数
 * @description 统一头像首字与角色文案，供后台壳层与单测复用
 * @author IPQC
 * @date 2026-11-14
 */

import type { AuthUser } from '@/types/auth'

/**
 * 获取用户头像展示字符。
 * @param {Pick<AuthUser, 'displayName'> | null} user - 当前登录用户
 * @returns {string} 姓名首字，未登录时为「未」
 */
export function getAvatarChar(user: Pick<AuthUser, 'displayName'> | null): string {
  return user?.displayName.trim().slice(0, 1) || '未'
}

/**
 * 获取角色中文名称。
 * @param {string} role - 后端角色标识
 * @returns {string} 顶栏展示角色
 */
export function getDisplayRole(role: string | undefined): string {
  return role === 'admin' ? '管理员' : '普通用户'
}
