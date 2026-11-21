import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useCheckScoreFocus } from '@/composables/use-check-score-focus'
import { useIpqcStore } from '@/stores/ipqc'

const routeQuery = ref<Record<string, string>>({})

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery.value }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { warning: vi.fn() },
}))

describe('use-check-score-focus', () => {
  it('缺少月份得分时标记已删除', async () => {
    setActivePinia(createPinia())
    const store = useIpqcStore()
    store.checkScores = { 注塑: { 1: 90 } }
    routeQuery.value = { workshop: '注塑', month: '9' }
    const { recordMissing } = useCheckScoreFocus()
    await Promise.resolve()
    expect(recordMissing.value).toBe(true)
  })
})