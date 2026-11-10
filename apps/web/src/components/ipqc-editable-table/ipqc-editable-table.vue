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
      <button v-if="showAdd" type="button" class="et-btn" @click="emit('add')">+ 新增行</button>
      <button type="button" class="et-btn" @click="exportCsv">导出 CSV</button>
    </div>

    <div class="et-scroll">
      <table class="et-table" :style="{ minWidth: `${minWidth}px` }">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="{ minWidth: `${col.width || 90}px` }"
            >{{ col.label }}</th>
            <th v-if="showDelete" class="et-del-col" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, ri) in pageRows"
            :key="rowId(row)"
            :class="rowClass ? rowClass(row) : undefined"
          >
            <td
              v-for="(col, ci) in columns"
              :key="`${rowId(row)}-${col.key}`"
              :class="{ 'et-num': col.type === 'num' }"
            >
              <span
                v-if="col.readOnly || col.format"
                class="et-render"
                :class="col.tone ? `et-badge et-badge--${col.tone(row)}` : ''"
              >{{ display(row, col) }}</span>
              <select
                v-else-if="col.type === 'select'"
                :data-cell="`${ri}-${ci}`"
                :value="String(row[col.key] ?? '')"
                class="et-select"
                @focus="activate"
                @change="onSelect(row, col, $event)"
                @keydown="onKeydown($event, ri, ci)"
              >
                <option v-for="op in col.options || []" :key="op" :value="op">{{ op }}</option>
              </select>
              <input
                v-else
                :data-cell="`${ri}-${ci}`"
                class="et-input"
                :inputmode="col.type === 'num' ? 'decimal' : undefined"
                :value="draftValue(row, col)"
                @focus="beginEdit(row, col)"
                @input="onInput(row, col, $event)"
                @compositionstart="composing = true"
                @compositionend="onCompositionEnd(row, col, $event)"
                @blur="commitCell(row, col)"
                @keydown="onKeydown($event, ri, ci)"
                @paste="onPaste($event, ri, ci)"
              />
            </td>
            <td v-if="showDelete" class="et-del-col">
              <button type="button" class="et-del" title="删除本行" @click="confirmDelete(row)">×</button>
            </td>
          </tr>
          <tr v-if="!pageRows.length">
            <td :colspan="columns.length + (showDelete ? 1 : 0)" class="et-empty">
              没有符合条件的数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="et-pager">
      <span>第 {{ page + 1 }} / {{ pages }} 页</span>
      <span class="et-spacer" />
      <button type="button" class="et-btn" :disabled="page === 0" @click="page--">上一页</button>
      <button type="button" class="et-btn" :disabled="page >= pages - 1" @click="page++">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEditHistory } from '@/composables/use-edit-history'
import { downloadCsv } from '@/composables/use-table-export'

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
const composing = ref(false)
const savedAt = ref('')
const drafts = reactive<Record<string, string>>({})
const history = useEditHistory(props.tableId)

const ids = new WeakMap<object, number>()
let nextId = 1
function rowId(row: Row): number {
  if (!ids.has(row)) ids.set(row, nextId++)
  return ids.get(row) as number
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
const minWidth = computed(() => props.columns.reduce((a, c) => a + (c.width || 90), 0) + 28)

watch(pages, (n) => {
  if (page.value > n - 1) page.value = n - 1
})

function draftKey(row: Row, col: EditColumn): string {
  return `${rowId(row)}:${col.key}`
}
function draftValue(row: Row, col: EditColumn): string {
  const k = draftKey(row, col)
  return k in drafts ? drafts[k] : String(row[col.key] ?? '')
}
function display(row: Row, col: EditColumn): string {
  if (col.format) return col.format(row)
  const v = row[col.key]
  return v == null || v === '' ? '—' : String(v)
}
function beginEdit(row: Row, col: EditColumn): void {
  activeTable = props.tableId
  const k = draftKey(row, col)
  if (!(k in drafts)) drafts[k] = String(row[col.key] ?? '')
}
function onInput(row: Row, col: EditColumn, ev: Event): void {
  drafts[draftKey(row, col)] = (ev.target as HTMLInputElement).value
}
function onCompositionEnd(row: Row, col: EditColumn, ev: Event): void {
  composing.value = false
  onInput(row, col, ev)
}

function normalize(col: EditColumn, raw: string): unknown {
  const text = raw.trim()
  if (col.type === 'num') {
    if (text === '') return ''
    const n = Number(text)
    return Number.isFinite(n) ? n : text
  }
  return text
}

function commitCell(row: Row, col: EditColumn, raw?: string): void {
  if (col.readOnly || col.format || col.type === 'select') return
  const k = draftKey(row, col)
  const before = row[col.key]
  const text = raw != null ? raw : k in drafts ? drafts[k] : String(before ?? '')
  const value = normalize(col, text)
  delete drafts[k]
  if (String(value ?? '') === String(before ?? '')) return
  row[col.key] = value
  history.push({ row, key: col.key, before, after: value, label: col.label })
  markSaved()
  emit('change', row, col.key, value)
}

function onSelect(row: Row, col: EditColumn, ev: Event): void {
  activeTable = props.tableId
  const before = row[col.key]
  const value = (ev.target as HTMLSelectElement).value
  if (String(value) === String(before ?? '')) return
  row[col.key] = value
  history.push({ row, key: col.key, before, after: value, label: col.label })
  markSaved()
  emit('change', row, col.key, value)
}

function markSaved(): void {
  savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function activate(): void {
  activeTable = props.tableId
}

function focusCell(ri: number, ci: number): void {
  const el = root.value?.querySelector<HTMLElement>(`[data-cell="${ri}-${ci}"]`)
  if (!el) return false as unknown as void
  el.focus()
  if (el instanceof HTMLInputElement) {
    const len = el.value.length
    el.setSelectionRange(len, len)
  }
}
function nextRowCell(ri: number, ci: number): [number, number] | null {
  const col = props.columns[ci]
  if (!col || col.readOnly || col.format) return null
  return ri + 1 < pageRows.value.length ? [ri + 1, ci] : null
}

function nextCell(ri: number, ci: number, dir: number): [number, number] | null {
  const cols = props.columns
  let r = ri
  let c = ci + dir
  if (c >= cols.length) {
    r += 1
    c = 0
  } else if (c < 0) {
    r -= 1
    c = cols.length - 1
  }
  while (r >= 0 && r < pageRows.value.length) {
    const col = cols[c]
    if (col && !col.readOnly && !col.format) return [r, c]
    c += dir
    if (c >= cols.length) {
      r += 1
      c = 0
    } else if (c < 0) {
      r -= 1
      c = cols.length - 1
    }
    if (r < 0 || r >= pageRows.value.length) break
  }
  return null
}

function onKeydown(ev: KeyboardEvent, ri: number, ci: number): void {
  if (ev.isComposing || composing.value) return
  if (ev.key === 'Escape') {
    const row = pageRows.value[ri]
    const col = props.columns[ci]
    if (row && col) delete drafts[draftKey(row, col)]
    ;(ev.target as HTMLElement).blur()
    return
  }
  if (ev.key === 'Enter') {
    ev.preventDefault()
    const row = pageRows.value[ri]
    const col = props.columns[ci]
    if (row && col && col.type !== 'select') {
      commitCell(row, col, (ev.target as HTMLInputElement).value)
    }
    const next = nextRowCell(ri, ci)
    if (next) void nextTick(() => focusCell(next[0], next[1]))
    else (ev.target as HTMLElement).blur()
    return
  }
  if (ev.key === 'Tab') {
    const next = nextCell(ri, ci, ev.shiftKey ? -1 : 1)
    if (!next) return
    ev.preventDefault()
    const row = pageRows.value[ri]
    const col = props.columns[ci]
    if (row && col && col.type !== 'select') {
      commitCell(row, col, (ev.target as HTMLInputElement).value)
    }
    const [r, c] = next
    void nextTick(() => focusCell(r, c))
  }
}

function onPaste(ev: ClipboardEvent, ri: number, ci: number): void {
  const raw = (ev.clipboardData?.getData('text/plain') || '').replace(/\r/g, '')
  if (!raw || !/[\t\n]/.test(raw)) return
  ev.preventDefault()
  const lines = raw.split('\n')
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  const grid = lines.map((l) => l.split('\t'))
  const cols = props.columns
  let count = 0
  grid.forEach((line, dri) => {
    const row = pageRows.value[ri + dri]
    if (!row) return
    line.forEach((text, dci) => {
      const col = cols[ci + dci]
      if (!col || col.readOnly || col.format) return
      const value = normalize(col, text)
      if (col.type === 'select' && !(col.options || []).includes(String(value))) return
      const before = row[col.key]
      if (String(value) === String(before ?? '')) return
      row[col.key] = value
      history.push({ row, key: col.key, before, after: value, label: col.label })
      count++
    })
  })
  if (!count) {
    ElMessage.warning('粘贴内容与本表字段不匹配')
    return
  }
  Object.keys(drafts).forEach((k) => delete drafts[k])
  markSaved()
  emit('bulk-change')
  ElMessage.success(
    `已填入 ${grid.length} 行 × ${Math.max(...grid.map((l) => l.length))} 列`
  )
}

function undoEdit(): void {
  const entry = history.undo()
  if (!entry) return
  delete drafts[`${rowId(entry.row)}:${entry.key}`]
  markSaved()
  emit('change', entry.row, entry.key, entry.before)
  ElMessage.success(`已撤销「${entry.label}」→ ${entry.before === '' ? '空' : entry.before}`)
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

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))
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
