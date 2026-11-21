<template>
  <div ref="root" class="et">
    <div class="et-toolbar">
      <input
        v-model="query"
        class="et-search"
        :placeholder="placeholder || '搜索（料号 / 品名 / 不良描述 / 责任人）'"
        @input="page = 0"
      />
      <span class="et-hint">
        共 <b>{{ filteredRows.length }}</b> 条<template v-if="filteredRows.length !== rows.length"> / 全部 {{ rows.length }}</template>
        <template v-if="unit"> · {{ unit }}</template>
      </span>
      <span class="et-editable">✎ 可直接编辑</span>
      <span class="et-save">{{ savedAt ? `已保存 ${savedAt}` : '失焦自动保存' }}</span>
      <span class="et-spacer" />
      <button type="button" class="et-btn" :disabled="!history.canUndo.value" @click="undoEdit">
        ↶ 撤销
      </button>
      <button
        v-if="showDelete"
        type="button"
        class="et-btn"
        :disabled="!selectedRow"
        @click="deleteSelected"
      >
        删除选中行
      </button>
      <button v-if="showAdd" type="button" class="et-btn" @click="emit('add')">+ 新增行</button>
      <button type="button" class="et-btn" @click="exportCsv">导出 CSV</button>
    </div>

    <VGrid
      class="et-revo-grid"
      :columns="gridColumns"
      :source="pageRows"
      theme="compact"
      resize
      @afteredit="onRevoAfterEdit"
      @beforecellfocus="onBeforeCellFocus"
    />

    <div class="et-pager">
      <span>第 {{ page + 1 }} / {{ pages }} 页</span>
      <span class="et-spacer" />
      <button type="button" class="et-btn" :disabled="page === 0" @click="page--">上一页</button>
      <button type="button" class="et-btn" :disabled="page >= pages - 1" @click="page++">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import VGrid, { useTemplates } from '@revolist/vue3-datagrid'
import type { CellProps, ColumnRegular } from '@revolist/revogrid'
import { ledgerApiTableFromId } from '@/composables/ledger-table-key'
import {
  commitGridCell,
  normalizeGridCell,
} from '@/composables/use-ipqc-grid-cell-commit'
import { persistLedgerUndo } from '@/composables/use-ipqc-ledger-save'
import { useEditHistory } from '@/composables/use-edit-history'
import { downloadCsv } from '@/composables/use-table-export'

import { setGridSaveContext } from './grid-save-context'
import {
  IpqcGridDeleteCell,
  IpqcGridFormatCell,
  IpqcGridSelectCell,
} from './ipqc-grid-cells'

type Row = Record<string, unknown>

export interface EditColumn {
  key: string
  label: string
  width?: number
  type?: 'text' | 'num' | 'select'
  options?: string[]
  readOnly?: boolean
  format?: (row: Row) => string
  tone?: (row: Row) => 'ok' | 'warn' | 'dan' | ''
}

const props = withDefaults(
  defineProps<{
    tableId: string
    rows: Row[]
    columns: EditColumn[]
    pageSize?: number
    unit?: string
    placeholder?: string
    showAdd?: boolean
    showDelete?: boolean
    fileBase?: string
    rowClass?: (row: Row) => string
  }>(),
  {
    pageSize: 20,
    unit: '',
    placeholder: '',
    showAdd: false,
    showDelete: false,
    fileBase: '',
  }
)

const emit = defineEmits<{
  change: [row: Row, key: string, value: unknown]
  'bulk-change': []
  add: []
  delete: [row: Row]
}>()

let activeTable = ''
const root = ref<HTMLElement | null>(null)
const query = ref('')
const page = ref(0)
const savedAt = ref('')
const selectedRow = ref<Row | null>(null)
const history = useEditHistory(props.tableId)
const templates = useTemplates()

function rowCellProps(model: Row): CellProps | undefined {
  const cls = props.rowClass?.(model)
  return cls ? { class: cls } : undefined
}

const gridColumns = computed<ColumnRegular[]>(() => {
  const cols: ColumnRegular[] = props.columns.map((col) => {
    const base: ColumnRegular = {
      prop: col.key,
      name: col.label,
      size: col.width ?? 90,
      cellProperties: (ctx) => rowCellProps(ctx.model as Row),
    }
    if (col.format) {
      return {
        ...base,
        readonly: true,
        cellTemplate: templates.template(IpqcGridFormatCell, {
          props: (ctx) => ({
            text: col.format!(ctx.model as Row),
            tone: col.tone?.(ctx.model as Row) || '',
          }),
          key: (ctx) => `${String((ctx.model as Row).id ?? ctx.rowIndex)}-${col.key}`,
        }),
      }
    }
    if (col.readOnly) {
      return { ...base, readonly: true }
    }
    if (col.type === 'select') {
      return {
        ...base,
        readonly: true,
        cellTemplate: templates.template(IpqcGridSelectCell, {
          props: (ctx) => ({
            row: ctx.model as Row,
            colKey: col.key,
            label: col.label,
            options: col.options || [],
          }),
          key: (ctx) => `${String((ctx.model as Row).id ?? ctx.rowIndex)}-${col.key}`,
        }),
      }
    }
    return base
  })
  if (props.showDelete) {
    cols.push({
      prop: '__del',
      name: '删',
      size: 44,
      readonly: true,
      cellTemplate: templates.template(IpqcGridDeleteCell, {
        props: (ctx) => ({ row: ctx.model as Row }),
        key: (ctx) => String((ctx.model as Row).id ?? ctx.rowIndex),
      }),
    })
  }
  return cols
})

function bindSaveContext(): void {
  setGridSaveContext({
    tableId: props.tableId,
    history,
    markSaved,
    onChange: (row, key, value) => emit('change', row, key, value),
    onDelete: (row) => void confirmDelete(row),
    ledgerTable: () => ledgerApiTableFromId(props.tableId),
  })
}

function onBeforeCellFocus(event: CustomEvent): void {
  activeTable = props.tableId
  bindSaveContext()
  const detail = event.detail as { model?: Row }
  selectedRow.value = detail.model ?? null
}

async function onRevoAfterEdit(event: CustomEvent): Promise<void> {
  activeTable = props.tableId
  const detail = event.detail as { prop?: string; model?: Row; val?: unknown; data?: Row }
  const row = detail.model ?? detail.data
  const prop = detail.prop
  if (!row || !prop || prop === '__del') return
  const col = props.columns.find((item) => item.key === prop)
  if (!col || col.readOnly || col.format || col.type === 'select') return
  const before = row[prop]
  const value = normalizeGridCell(col, String(detail.val ?? before ?? ''))
  const apiTable = ledgerApiTableFromId(props.tableId)
  const ok = await commitGridCell({
    row,
    col,
    value,
    before,
    apiTable,
    history,
    onSaved: markSaved,
  })
  if (!ok) {
    row[prop] = before
    return
  }
  emit('change', row, col.key, value)
}

const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.rows
  return props.rows.filter((row) =>
    props.columns.some((col) => {
      const v = col.format ? col.format(row) : row[col.key]
      return String(v ?? '').toLowerCase().includes(q)
    })
  )
})

const pages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / props.pageSize)))
const pageRows = computed(() =>
  filteredRows.value.slice(page.value * props.pageSize, (page.value + 1) * props.pageSize)
)
watch(pages, (n) => {
  if (page.value > n - 1) page.value = n - 1
})

watch(
  () => props.rows,
  () => {
    history.clear()
    selectedRow.value = null
  },
)

function markSaved(): void {
  savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

async function undoEdit(): Promise<void> {
  const pending = history.peek()
  if (!pending) return
  const apiTable = ledgerApiTableFromId(props.tableId)
  if (apiTable) {
    try {
      await persistLedgerUndo(apiTable, pending.row, pending.key, pending.before, pending.after)
    } catch {
      return
    }
  }
  const entry = history.undo()
  if (!entry) return
  markSaved()
  emit('change', entry.row, entry.key, entry.before)
  ElMessage.success(`已撤销「${entry.label}」→ ${entry.before === '' ? '空' : entry.before}`)
}

async function deleteSelected(): Promise<void> {
  if (!selectedRow.value) return
  await confirmDelete(selectedRow.value)
}

async function confirmDelete(row: Row): Promise<void> {
  try {
    await ElMessageBox.confirm('删除本行后需重新录入，是否继续？', '删除记录', {
      type: 'warning',
    })
  } catch {
    return
  }
  emit('delete', row)
}

function exportCsv(): void {
  downloadCsv(
    props.fileBase || `IPQC_${props.tableId}`,
    props.columns.map((c) => ({
      key: c.key,
      label: c.label,
      format: c.format
        ? (row: Row) => c.format!(row)
        : undefined,
    })),
    filteredRows.value
  )
}

function onGlobalKeydown(ev: KeyboardEvent): void {
  if (!(ev.ctrlKey || ev.metaKey) || ev.key.toLowerCase() !== 'z') return
  if (activeTable !== props.tableId) return
  if (!root.value?.contains(document.activeElement)) return
  ev.preventDefault()
  undoEdit()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  bindSaveContext()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  setGridSaveContext(null)
})
</script>

<style scoped>
.et {
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 12px;
}
.et-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-bottom: 1px solid #edf1f6;
}
.et-search {
  width: 280px;
  max-width: 100%;
  padding: 5px 9px;
  border: 1px solid #dbe3ee;
  border-radius: 6px;
  font-size: 12px;
  color: #1f2733;
}
.et-hint,
.et-save {
  font-size: 11.5px;
  color: #7a8494;
}
.et-hint b {
  color: #1f2733;
}
.et-editable {
  font-size: 11px;
  color: #0f766e;
  background: #e6f6f4;
  border-radius: 999px;
  padding: 2px 8px;
}
.et-save {
  color: #0f9d58;
}
.et-spacer {
  flex: 1;
}
.et-btn {
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  color: #46586e;
  cursor: pointer;
  white-space: nowrap;
}
.et-btn:hover:not(:disabled) {
  border-color: #3b6fe0;
  color: #3b6fe0;
}
.et-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.et-scroll {
  max-height: 520px;
  overflow: auto;
}
.et-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.et-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  text-align: left;
  padding: 7px 8px;
  border-bottom: 1px solid #e3e8f0;
  white-space: nowrap;
}
.et-table td {
  padding: 3px 4px;
  border-bottom: 1px solid #f0f3f8;
  vertical-align: middle;
}
.et-table tr:hover td {
  background: #fafcff;
}
.et-table tr.et-row--focus td {
  background: #e8f0fe;
}
.et-revo-grid {
  height: 520px;
  width: 100%;
}
.et-revo-grid :deep(select.et-select) {
  width: 100%;
  min-width: 60px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  color: #1f2733;
  cursor: pointer;
}
.et-revo-grid :deep(select.et-select:hover) {
  border-color: #dbe3ee;
}
.et-revo-grid :deep(select.et-select:focus) {
  outline: none;
  border-color: #3b6fe0;
  background: #fff;
}
.et-table tr.row-ng td {
  background: #fff5f5;
}
.et-input,
.et-select {
  width: 100%;
  min-width: 60px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  color: #1f2733;
}
.et-input:hover,
.et-select:hover {
  border-color: #dbe3ee;
}
.et-input:focus,
.et-select:focus {
  outline: none;
  border-color: #3b6fe0;
  background: #fff;
}
.et-num .et-input {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.et-render {
  display: inline-block;
  padding: 2px 4px;
}
.et-badge {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}
.et-badge--ok {
  background: #e8f6ee;
  color: #0b7a45;
}
.et-badge--warn {
  background: #fdf5df;
  color: #a16207;
}
.et-badge--dan {
  background: #fde8e8;
  color: #b91c1c;
}
.et-del-col {
  width: 30px;
  text-align: center;
}
.et-del {
  border: none;
  background: none;
  color: #c8d2de;
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}
.et-del:hover {
  color: #dc2626;
}
.et-empty {
  text-align: center;
  color: #a8b6c7;
  padding: 24px 0;
}
.et-pager {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 11.5px;
  color: #7a8494;
  border-top: 1px solid #edf1f6;
}
</style>
