import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

import { fetchLedgerRow } from '@/api/ledger'
import type { LedgerApiTable } from '@/composables/ledger-table-key'

export function useLedgerRowFocus(table: LedgerApiTable | (() => LedgerApiTable)) {
  const route = useRoute()
  const focusRowId = ref('')
  const rowMissing = ref(false)

  async function resolveRowId(): Promise<void> {
    rowMissing.value = false
    focusRowId.value = ''
    const q = route.query.rowId
    if (typeof q !== 'string' || !q) {
      return
    }
    const tableKey = typeof table === 'function' ? table() : table
    try {
      await fetchLedgerRow(tableKey, q)
      focusRowId.value = q
    } catch {
      rowMissing.value = true
      ElMessage.warning('该行已删除')
    }
  }

  watch(
    () => route.query.rowId,
    () => {
      void resolveRowId()
    },
    { immediate: true },
  )

  function rowFocusClass(row: Record<string, unknown>): string {
    const id = String(row.id ?? '')
    return id && id === focusRowId.value ? 'et-row--focus' : ''
  }

  return { focusRowId, rowMissing, rowFocusClass }
}