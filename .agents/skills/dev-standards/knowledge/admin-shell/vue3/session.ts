// 当前用户适配层。复制到 src/layouts/default-layout/session.ts
//
// 壳只需要三样东西：显示名、角色名、退出登录。
// 换成你自己的 auth store（pinia / 自研）时，只改这个文件，壳组件不用动。

import { computed, readonly, ref } from 'vue'

export interface CurrentUser {
  name: string
  role: string
}

const user = ref<CurrentUser | null>(null)
const isLoggedIn = computed(() => user.value !== null)

export function useSession() {
  /** 登录成功后由登录页调用 */
  function setUser(next: CurrentUser | null): void {
    user.value = next
  }

  /** 退出登录：清本地态；真实项目里还要调接口、清 token */
  function logout(): void {
    user.value = null
    try {
      localStorage.removeItem('app:token')
    } catch {
      /* ignore */
    }
  }

  return { user: readonly(user), isLoggedIn, setUser, logout }
}

/** 顶栏两侧的展示值，空态给兜底文案而不是留白 */
export function useUserDisplay() {
  const avatarChar = computed(() => user.value?.name.slice(0, 1) ?? '未')
  const displayName = computed(() => user.value?.name ?? '未登录')
  const displayRole = computed(() => user.value?.role ?? '')
  return { avatarChar, displayName, displayRole }
}
