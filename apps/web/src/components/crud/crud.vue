<template>
  <!-- 结构：筛选条 → 14px → 表格板块（细边框圆角无阴影）→ 分页 -->
  <div class="crud-root">
    <!-- 筛选区（无边框筛选条，浮于表格板块上方） -->
    <div
      v-if="filterItems.length || $slots.filters || $slots['filters-actions']"
      class="crud-filters"
    >
      <TableFilters
        :items="filterItems"
        v-model:filter-values="filterValues"
        @change="(k: string, v: any) => emit('filterChange', k, v)"
      />
      <slot name="filters" />
      <div v-if="$slots['filters-actions']" class="crud-filters-spacer" />
      <slot name="filters-actions" />
    </div>

    <!-- 表格板块：表格贴边铺满，外层只负责边框和高度链 -->
    <div class="crud-table">
      <slot name="table" />
    </div>

    <!-- 分页导航 -->
    <div v-if="pagination" class="crud-pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :layout="pagination.layout ?? 'total, sizes, prev, pager, next, jumper'"
        :page-sizes="pagination.pageSizes ?? [10, 20, 50, 100, 500]"
        background
        @current-change="pagination.onPageChange?.(pagination.page!)"
        @size-change="pagination.onSizeChange?.(pagination.pageSize!)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TableFilters from './table-filters.vue'
import type { FilterItem } from './types'

withDefaults(
  defineProps<{
    filterItems?: FilterItem[]
    pagination?: {
      page: number
      pageSize: number
      total: number
      layout?: string
      pageSizes?: number[]
      onPageChange?: (page: number) => void
      onSizeChange?: (size: number) => void
    }
  }>(),
  {
    filterItems: () => [],
  },
)

const filterValues = defineModel<Record<string, any>>('filterValues', { default: () => ({}) })

const emit = defineEmits<{
  filterChange: [key: string, value: any]
}>()
</script>

<style lang="scss" scoped>
.crud-root {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

/* 筛选条：无边框、无内边距，左边缘与表格板块对齐 */
.crud-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.crud-filters-spacer {
  flex: 1;
}

/* 表格板块：细边框 + 圆角 + 白底 + 无阴影，表格贴边 */
.crud-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-bg-color, #fff);
  overflow: hidden;

  /* 插槽内包裹层（如分段容器）须参与 flex 高度链，否则横向滚动条沉到内容底部 */
  > * {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
}

.crud-pagination {
  display: flex;
  justify-content: flex-start;
  flex-shrink: 0;
}
</style>
