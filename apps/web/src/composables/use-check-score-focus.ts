import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

export function useCheckScoreFocus(onWorkshop?: (ws: WorkshopKey) => void) {
  const route = useRoute()
  const store = useIpqcStore()
  const recordMissing = ref(false)
  const focusMonth = ref<number | null>(null)

  watch(
    () => [route.query.workshop, route.query.month, store.checkScores] as const,
    () => {
      recordMissing.value = false
      focusMonth.value = null
      const ws = route.query.workshop
      const monthRaw = route.query.month
      if (typeof ws !== 'string' || monthRaw == null || monthRaw === '') {
        return
      }
      const month = Number(monthRaw)
      if (!Number.isFinite(month)) {
        return
      }
      const bucket = store.checkScores[ws as WorkshopKey]
      if (!bucket || bucket[month] === undefined) {
        recordMissing.value = true
        ElMessage.warning('该记录已删除')
        return
      }
      focusMonth.value = month
      onWorkshop?.(ws as WorkshopKey)
    },
    { immediate: true, deep: true },
  )

  function monthCellClass(ws: string, month: number): string {
    if (
      typeof route.query.workshop === 'string' &&
      route.query.workshop === ws &&
      focusMonth.value === month
    ) {
      return 'cell--focus'
    }
    return ''
  }

  return { recordMissing, focusMonth, monthCellClass }
}