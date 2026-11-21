<template>
  <div
    ref="wrapperRef"
    class="table-wrapper"
    :class="{
      'is-empty': !data.length && !loading,
      'is-empty-expand': hasExpandColumn && !data.length && !loading && !emptyFill,
      'is-empty-fill': !data.length && !loading && emptyFill,
      'is-row-clickable': !!onRowClick,
    }"
  >
    <el-table
      ref="tableRef"
      class="crud-table"
      :data="data"
      :size="size"
      v-loading="loading"
      :border="border"
      :stripe="stripe"
      :row-key="rowKey"
      :tree-props="treeProps"
      :expand-row-keys="expandRowKeys"
      :default-expand-all="defaultExpandAll"
      :row-class-name="rowClassName"
      :height="resolvedHeight"
      :highlight-current-row="highlightCurrentRow"
      fit
      @row-click="onRowClick"
      @selection-change="onSelectionChange"
      @expand-change="(r: any, e: any[]) => emit('expand-change', r, e)"
      @sort-change="(e: any) => emit('sort-change', e)"
    >
      <template #empty>
        <span class="table-empty-text">暂无数据</span>
      </template>

      <template v-for="col in columns" :key="colKey(col)">
        <!-- ===== 多选 ===== -->
        <el-table-column
          v-if="col.type === 'selection'"
          type="selection"
          :width="colSizing(col).width ?? 50"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          fixed="left"
          :reserve-selection="!!rowKey"
        />

        <!-- ===== 序号 ===== -->
        <el-table-column
          v-else-if="col.type === 'index'"
          type="index"
          :label="col.label ?? '序号'"
          :width="colSizing(col).width ?? 60"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          fixed="left"
          :index="indexMethod(col)"
        />

        <!-- ===== 图片 ===== -->
        <el-table-column
          v-else-if="col.type === 'image'"
          :prop="col.prop"
          :label="col.label"
          :width="colSizing(col).width"
          :min-width="colSizing(col).minWidth ?? 100"
          :class-name="colSizing(col).className"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          :sortable="col.sortable"
          :fixed="resolveColFixed(col)"
        >
          <template #default="{ row }">
            <el-image
              v-if="row[col.prop]"
              :src="row[col.prop]"
              :style="{ width: (col.imageWidth ?? 40) + 'px', height: (col.imageHeight ?? 40) + 'px' }"
              fit="cover"
              :preview-src-list="getPreviewList(row, col)"
              preview-teleported
              lazy
            />
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <!-- ===== 标签 ===== -->
        <el-table-column
          v-else-if="col.type === 'tag'"
          :prop="col.prop"
          :label="col.label"
          :width="colSizing(col).width"
          :min-width="colSizing(col).minWidth"
          :class-name="colSizing(col).className"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          :sortable="col.sortable"
          :fixed="resolveColFixed(col)"
        >
          <template #default="{ row }">
            <el-tag
              :type="getTagType(row[col.prop], col)"
              :round="col.round ?? false"
              :class="{ 'is-clickable': !!col.onClick }"
              @click="col.onClick?.(row[col.prop], row)"
            >
              {{ col.formatter ? col.formatter(row[col.prop], row, 0) : row[col.prop] }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- ===== 日期 ===== -->
        <el-table-column
          v-else-if="col.type === 'date'"
          :prop="col.prop"
          :label="col.label"
          :width="colSizing(col).width"
          :min-width="colSizing(col).minWidth ?? 170"
          :class-name="colSizing(col).className"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          :sortable="col.sortable"
          :show-overflow-tooltip="col.showOverflowTooltip ?? true"
          :formatter="dateFormatter(col)"
          :fixed="resolveColFixed(col)"
        />

        <!-- ===== 自定义插槽 ===== -->
        <el-table-column
          v-else-if="col.type === 'custom'"
          :prop="col.prop"
          :label="col.label"
          :width="isActionColumn(col) ? actionColumnWidth(col) : colSizing(col).width"
          :min-width="colSizing(col).minWidth"
          :class-name="actionColumnClass(col)"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          :sortable="col.sortable"
          :show-overflow-tooltip="col.showOverflowTooltip"
          :fixed="resolveColFixed(col)"
        >
          <template #default="scope">
            <slot :name="col.slotName ?? `col-${col.prop}`" v-bind="scope">
              <span class="cell-text">{{ scope.row[col.prop] ?? '—' }}</span>
            </slot>
          </template>
        </el-table-column>

        <!-- ===== 展开 ===== -->
        <el-table-column
          v-else-if="col.type === 'expand'"
          type="expand"
          :width="col.width ?? 48"
        >
          <template #default="scope">
            <slot name="expand" v-bind="scope" />
          </template>
        </el-table-column>

        <!-- ===== 操作 ===== -->
        <el-table-column
          v-else-if="col.type === 'action'"
          :label="col.label ?? '操作'"
          :width="actionColumnWidth(col)"
          :min-width="colSizing(col).minWidth"
          :class-name="actionColumnClass(col)"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          :fixed="resolveColFixed(col)"
        >
          <template #default="{ row, $index }">
            <div class="action-btns">
              <el-button
                v-for="(btn, i) in visibleButtons(col, row)"
                :key="i"
                link
                size="small"
                :type="btn.type === 'text' ? 'primary' : btn.type"
                :icon="resolveActionButtonIcon(btn)"
                :title="btn.tooltip ?? btn.label"
                @click.stop="btn.onClick(row, $index)"
              >
                {{ btn.label }}
              </el-button>

              <el-dropdown v-if="hasMore(col, row)" trigger="hover" :teleported="true">
                <el-button link size="small" type="primary" class="action-more-btn">
                  更多
                  <el-icon class="action-more-btn__arrow"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="(btn, i) in hiddenButtons(col, row)"
                      :key="i"
                      @click="btn.onClick(row, $index)"
                    >
                      <el-icon v-if="resolveActionButtonIcon(btn)">
                        <component :is="resolveActionButtonIcon(btn)" />
                      </el-icon>
                      {{ btn.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>

        <!-- ===== 文本 ===== -->
        <el-table-column
          v-else-if="col.type === 'text'"
          :prop="col.prop"
          :label="col.label"
          :width="colSizing(col).width"
          :min-width="colSizing(col).minWidth ?? 120"
          :class-name="colSizing(col).className"
          :align="colAlign(col)"
          :header-align="colHeaderAlign(col)"
          :sortable="col.sortable"
          :show-overflow-tooltip="!col.onClick"
          :fixed="resolveColFixed(col)"
        >
          <template #default="{ row, $index }">
            <button
              v-if="col.onClick"
              type="button"
              class="cell-link-btn"
              :title="textCellValue(col, row, $index)"
              @click.stop="col.onClick(row[col.prop], row)"
            >
              {{ textCellValue(col, row, $index) }}
            </button>
            <span v-else class="cell-text">{{ textCellValue(col, row, $index) }}</span>
          </template>
        </el-table-column>
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { formatPattern } from '@/utils/date-format'
import { resolveActionButtonIcon } from './action-button-icons'
import {
  isActionColumn,
  isLeftAlignColumn,
  resolveActionColumnWidth,
  resolveColFixed,
  resolveColSizing,
} from './column-sizing'
import { shouldToggleRowExpand } from './row-expand-click'
import type {
  ActionButton,
  ActionColumn,
  ColumnSchema,
  DateColumn,
  ImageColumn,
  IndexColumn,
  SelectionColumn,
  TableProps,
  TagColumn,
  TextColumn,
} from './types'

const props = withDefaults(
  defineProps<
    TableProps & {
      treeProps?: { children?: string }
      expandRowKeys?: (string | number)[]
      defaultExpandAll?: boolean
      rowClassName?: string | ((data: { row: any; rowIndex: number }) => string)
    }
  >(),
  {
    size: 'small' as const,
    loading: false,
    border: false,
    stripe: false,
    rowKey: 'id',
    treeProps: undefined,
    expandRowKeys: undefined,
    defaultExpandAll: false,
    rowClassName: undefined,
    emptyFill: true,
  },
)

const emit = defineEmits<{
  'update:selection': [rows: any[]]
  'selection-change': [rows: any[]]
  'expand-change': [row: any, expandedRows: any[]]
  'sort-change': [{ column: any; prop: string; order: 'ascending' | 'descending' | null }]
}>()

const tableRef = ref()
const wrapperRef = ref<HTMLElement | null>(null)
const wrapperHeight = ref(0)
let observer: ResizeObserver | null = null

// 是否含展开列：有 expand 列时 el-table 的数值 height 与展开行组合会塌缩，
// 改用 CSS 百分比高度（height="100%"），让 el-table 走完整 layout 且 body 由容器撑开
const hasExpandColumn = computed(() => props.columns.some((c) => c.type === 'expand'))

// 高度策略：
// - 有 expand 列 → 用 '100%'（CSS 百分比高度），完整 layout + 展开行正常
// - 无 expand 列 → 数值 px（ResizeObserver 测量），普通列表内部滚动最可靠
const resolvedHeight = computed(() => {
  if (hasExpandColumn.value) {
    if (!props.data.length) {
      // 顶层空表仍测高撑满容器，供「暂无数据」垂直居中；嵌套展开子表 emptyFill=false 时不固定高度
      if (props.emptyFill && wrapperHeight.value > 0) return wrapperHeight.value
      return undefined
    }
    return '100%'
  }
  if (props.maxHeight) return props.maxHeight
  return wrapperHeight.value > 0 ? wrapperHeight.value : '100%'
})

onMounted(async () => {
  const el = wrapperRef.value
  if (el && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        wrapperHeight.value = Math.floor(entry.contentRect.height)
      }
    })
    // 首次测量前等两帧：内层 el-table 的列/行布局晚于本组件挂载（它在自身 onMounted 里
    // await nextTick 后才 updateColumns + rAF doLayout）。过早测量会读到塌缩中的高度
    // （典型：展开行内嵌套子表测得 16px），写入后 el-table 固定该高度、wrapper 随之被钉死，
    // 后续 RO 反复测得同一错误值无法自愈 → 表格不可见且无法滚动。
    await nextTick()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    // 两次 await 期间组件可能已被卸载（onBeforeUnmount 会 disconnect 并把 observer 置 null）
    if (observer && el?.isConnected) {
      observer.observe(el)
      wrapperHeight.value = Math.floor(el.clientHeight)
    }
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

defineExpose({
  getTableRef: () => tableRef.value,
  clearSelection: () => tableRef.value?.clearSelection(),
  toggleRowSelection: (row: any, selected?: boolean) =>
    tableRef.value?.toggleRowSelection(row, selected),
  sort: (prop: string, order: string) => tableRef.value?.sort(prop, order),
  toggleRowExpansion: (row: any, expanded?: boolean) =>
    tableRef.value?.toggleRowExpansion(row, expanded),
  doLayout: () => tableRef.value?.doLayout?.(),
})

function onSelectionChange(rows: any[]) {
  emit('update:selection', rows)
  emit('selection-change', rows)
  const selCol = props.columns.find((c) => c.type === 'selection') as SelectionColumn | undefined
  selCol?.onSelectionChange?.(rows)
}

function indexMethod(col: IndexColumn) {
  return (i: number) => (col.startIndex ?? 1) + i
}

function colKey(col: ColumnSchema): string {
  if (col.type === 'selection') return '_selection'
  if (col.type === 'index') return '_index'
  if (col.type === 'action') return '_action'
  if (col.type === 'expand') return '_expand'
  return (col as any).prop ?? ''
}

/** 列对齐：显式 align > 业务文本列左对齐 > 居中 */
function colAlign(col: ColumnSchema): 'left' | 'center' | 'right' {
  if (col.align) return col.align
  return isLeftAlignColumn(col) ? 'left' : 'center'
}

/** 表头对齐：显式 headerAlign 优先，否则与单元格 align 一致 */
function colHeaderAlign(col: ColumnSchema): 'left' | 'center' | 'right' {
  return col.headerAlign ?? colAlign(col)
}

function colSizing(col: ColumnSchema) {
  return resolveColSizing(col)
}

function actionColumnWidth(col: ColumnSchema): number {
  return resolveActionColumnWidth(col, props.data)
}

function actionColumnClass(col: ColumnSchema): string | undefined {
  const parts = [colSizing(col).className, isActionColumn(col) ? 'col-action-auto' : ''].filter(
    Boolean,
  )
  return parts.length ? parts.join(' ') : undefined
}

/** 操作列 width 随数据变化后触发表格重新布局（fixed 列尤其需要） */
watch(
  () =>
    props.columns.filter(isActionColumn).map((col) => resolveActionColumnWidth(col, props.data)),
  () => {
    nextTick(() => tableRef.value?.doLayout?.())
  },
)

function getPreviewList(row: Record<string, any>, col: ImageColumn): string[] {
  const src = col.previewSrcList ? row[col.previewSrcList] : row[col.prop]
  if (Array.isArray(src)) return src
  return src ? [src] : []
}

function getTagType(
  value: any,
  col: TagColumn,
): '' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  if (col.tagMap && typeof value === 'string') {
    return col.tagMap[value] ?? col.tagType ?? ''
  }
  return col.tagType ?? ''
}

function dateFormatter(col: DateColumn) {
  const fmt = col.format ?? 'YYYY-MM-DD HH:mm:ss'
  return (_row: any, _column: any, cellValue: any, _index: number) =>
    formatPattern(cellValue, fmt)
}

function textCellValue(col: TextColumn, row: Record<string, any>, index: number): string {
  const value = row[col.prop]
  if (col.formatter) return col.formatter(value, row, index) || '—'
  return value != null && value !== '' ? String(value) : '—'
}

function visibleButtons(col: ActionColumn, row: Record<string, any>): ActionButton[] {
  const max = col.maxVisible ?? 3
  return col.buttons.filter((b) => !b.hidden?.(row)).slice(0, max)
}

function hasMore(col: ActionColumn, row: Record<string, any>): boolean {
  const max = col.maxVisible ?? 3
  return col.buttons.filter((b) => !b.hidden?.(row)).length > max
}

function hiddenButtons(col: ActionColumn, row: Record<string, any>): ActionButton[] {
  const max = col.maxVisible ?? 3
  return col.buttons.filter((b) => !b.hidden?.(row)).slice(max)
}

function onRowClick(row: Record<string, any>, column: { type?: string } | undefined, event: Event) {
  props.onRowClick?.(row, column, event)
  if (!hasExpandColumn.value || !shouldToggleRowExpand(column, event)) return
  tableRef.value?.toggleRowExpansion(row)
}
</script>

<style lang="scss" scoped>
.table-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  /* 两种撑满方式并用，保证 wrapper 高度恒为「容器剩余高度」而非内容高度：
     - flex: 1 —— 父容器是 flex 布局时弹性分配；
     - height: 100% —— 父容器是普通块（有确定高度）时按百分比撑满。
     否则 wrapper 退化为内容高度，ResizeObserver 测到的是表格全部行的高度，
     表格超出容器被 overflow:hidden 裁剪，滚动条沉到可视区之下、不在表格底部。 */
  height: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.table-wrapper :deep(.crud-table) {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.table-wrapper :deep(.col-action-auto .cell) {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.table-wrapper:has(.el-table__expand-column) :deep(.el-table__body tr),
.table-wrapper.is-row-clickable :deep(.el-table__body tr) {
  cursor: pointer;
}

.table-wrapper:has(.el-table__expand-column) :deep(.el-table__body .el-button:not(.is-disabled)),
.table-wrapper:has(.el-table__expand-column) :deep(.el-table__body a),
.table-wrapper:has(.el-table__expand-column) :deep(.el-table__body [data-stop-row-expand]) {
  cursor: pointer;
}

// 禁用按钮（无权限）不给手型：显式 not-allowed，优先级压过上面的行内按钮规则
.table-wrapper:has(.el-table__expand-column) :deep(.el-table__body .el-button.is-disabled) {
  cursor: not-allowed;
}

.text-muted {
  color: #c0c4cc;
}

.cell-text {
  font-size: 13px;
  color: var(--el-text-color-primary, #303133);
}

.cell-link-btn {
  display: inline-block;
  max-width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  color: var(--el-color-primary, #409eff);

  &:hover {
    text-decoration: underline;
  }
}

.action-btns {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-wrap: nowrap;
  vertical-align: middle;
}

/* link + icon：统一 inline-flex 中线，去掉 EP 默认 icon 外边距造成的上下/左右错位 */
.action-btns :deep(.el-button.is-link) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 6px;
  margin: 0;
  line-height: 1;
  vertical-align: middle;
}

.action-btns :deep(.el-button.is-link > span) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1;
}

.action-btns :deep(.el-button.is-link .el-icon) {
  margin: 0;
  font-size: 14px;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.action-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.action-more-btn__arrow {
  margin: 0;
  font-size: 12px;
  width: 12px;
  height: 12px;
}

.table-wrapper :deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.25;

  .el-icon {
    margin: 0;
    font-size: 14px;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
}

.is-clickable {
  cursor: pointer;
}

/* 空数据：在表格 body 可视区域内水平 + 垂直居中 */
.table-wrapper :deep(.el-table__body-wrapper) {
  position: relative;
}

/* 展开列空表：避免 height:100% 链塌缩 */
.table-wrapper.is-empty-expand:not(.is-empty-fill) {
  height: auto;
}

.table-wrapper.is-empty.is-empty-fill :deep(.el-table__inner-wrapper) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper.is-empty.is-empty-fill :deep(.el-table__body-wrapper) {
  flex: 1;
  min-height: 0;
  /* 覆盖 el-table 空表时对 body 写入的固定小高度，让 body 占满 header 以下区域 */
  height: auto !important;
  position: relative;
}

.table-wrapper.is-empty.is-empty-fill :deep(.el-table__empty-block) {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  min-height: 0 !important;
  height: auto !important;
}

.table-empty-text {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
