// 侧边栏折叠状态（含持久化）。复制到 src/composables/use-sidebar.ts

import { ref, watch } from 'vue'

const STORAGE_KEY = 'app:sidebar-collapsed'

function readStored(): boolean {
  // 隐私模式下读 localStorage 会抛异常，不能裸调
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStored(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* 存不进去就算了，不影响功能 */
  }
}

const collapsed = ref(readStored())
watch(collapsed, writeStored)

export function useSidebar() {
  function toggle(): void {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
