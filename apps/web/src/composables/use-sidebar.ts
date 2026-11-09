import { ref, watch } from 'vue'

const STORAGE_KEY = 'ipqc:sidebar-collapsed'

function readStored(): boolean {
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
    /* ignore */
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
