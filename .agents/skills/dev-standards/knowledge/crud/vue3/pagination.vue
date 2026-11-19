<template>
  <div class="pagination" :class="{ 'is-fixed': fixed }">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentPageSize"
      :total="config.total"
      :layout="config.layout ?? 'total, sizes, prev, pager, next, jumper'"
      :page-sizes="config.pageSizes ?? [10, 20, 50, 100, 500, 1000]"
      :background="config.background ?? true"
      :small="config.small ?? false"
      :disabled="config.disabled ?? false"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PaginationConfig } from './types'

const props = withDefaults(defineProps<{
  config: PaginationConfig
  fixed?: boolean
}>(), { fixed: false })

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [size: number]
}>()

const currentPage = ref(props.config.page ?? 1)
const currentPageSize = ref(props.config.pageSize ?? 20)

// 外部 page 变化时同步
watch(() => props.config.page, (v) => {
  if (v !== undefined) currentPage.value = v
})

watch(() => props.config.pageSize, (v) => {
  if (v !== undefined) currentPageSize.value = v
})

function onPageChange(page: number) {
  emit('update:page', page)
  props.config.onPageChange?.(page)
}

function onSizeChange(size: number) {
  emit('update:pageSize', size)
  props.config.onSizeChange?.(size)
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: flex-start;
  padding: 16px 0 0;
}

.pagination.is-fixed {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
  z-index: 10;
}
</style>
