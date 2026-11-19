// 当前用户适配层。复制到 src/domain/session.ts
//
// 壳只需要三样：显示名、角色名、退出登录。
// 换成自己的 auth store / 登录态模块时只改这个文件，壳组件不用动。

import Vue from 'vue'

export interface CurrentUser {
  name: string
  role: string
}

export const sessionState = Vue.observable<{ user: CurrentUser | null }>({ user: null })

/** 登录成功后由登录页调用 */
export function setCurrentUser(user: CurrentUser | null): void {
  sessionState.user = user
}

export function getCurrentUser(): CurrentUser | null {
  return sessionState.user
}

export function getOperatorName(): string {
  return sessionState.user ? sessionState.user.name : '未登录'
}

export function getOperatorRole(): string {
  return sessionState.user ? sessionState.user.role : ''
}

export function getAvatarChar(): string {
  const name = sessionState.user ? sessionState.user.name : ''
  return name ? name.slice(0, 1) : '未'
}

/** 真实项目里还要调登出接口、清 token；这里只清本地态 */
export function signOut(): void {
  sessionState.user = null
  try {
    localStorage.removeItem('app:token')
  } catch {
    /* IE11 隐私模式下会抛异常，吞掉即可 */
  }
}
