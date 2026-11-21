<template>
  <div class="ledger-sync-preview">
    <Crud :pagination="pagination">
      <template #filters>
        <el-radio-group :model-value="filter" size="small" @update:model-value="onFilterChange">
          <el-radio-button value="all">全部文件</el-radio-button>
          <el-radio-button value="parsed">将写入本机</el-radio-button>
          <el-radio-button value="unparsed">未解析</el-radio-button>
          <el-radio-button value="problem">存在问题</el-radio-button>
        </el-radio-group>
      </template>
      <template #table>
        <Table
          :columns="columns"
          :data="pageRows"
          row-key="path"
          :border="true"
          size="small"
        />
      </template>
    </Crud>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Crud, Table } from '@/components/crud'
import type { ColumnSchema } from '@/components/crud'
import {
  STATUS_LABELS,
  filterPreviewFiles,
  type PreviewFilter,
  type PreviewLedgerFile,
} from '@/views/data/ledger-selection'

const props = defineProps<{
  files: PreviewLedgerFile[]
  filter: PreviewFilter
}>()

const emit = defineEmits<{
  'update:filter': [value: PreviewFilter]
}>()

const page = ref(1)
const pageSize = ref(20)

const sortedFilteredFiles = computed(() => {
  const list = filterPreviewFiles(props.files, props.filter)
  return [...list].sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
})

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedFilteredFiles.value.slice(start, start + pageSize.value)
})

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  total: sortedFilteredFiles.value.length,
  pageSizes: [10, 20, 50, 100],
  onPageChange: (next: number) => {
    page.value = next
  },
  onSizeChange: (size: number) => {
    pageSize.value = size
    page.value = 1
  },
}))

const columns = computed<ColumnSchema[]>(() => [
  {
    type: 'index',
    label: '序号',
    width: 56,
    startIndex: (page.value - 1) * pageSize.value + 1,
  },
  { type: 'text', prop: 'name', label: '文件名', minWidth: 160, showOverflowTooltip: true },
  { type: 'text', prop: 'path', label: '路径', minWidth: 220, showOverflowTooltip: true },
  { type: 'text', prop: 'extension', label: '扩展名', width: 88 },
  {
    type: 'tag',
    prop: 'status',
    label: '状态',
    width: 96,
    tagMap: {
      parsed: 'success',
      unrecognized: 'info',
      unsupported: 'info',
      excluded: 'info',
      duplicate: 'warning',
      invalid: 'danger',
    },
    formatter: (value: string) => STATUS_LABELS[value] ?? value,
  },
  { type: 'text', prop: 'reason', label: '原因', minWidth: 160, showOverflowTooltip: true },
  { type: 'text', prop: 'label', label: '角色', minWidth: 120, showOverflowTooltip: true },
  { type: 'text', prop: 'modifiedAt', label: '修改时间', width: 168 },
])

watch(
  () => props.filter,
  () => {
    page.value = 1
  },
)

watch(
  () => props.files.length,
  () => {
    page.value = 1
  },
)

function onFilterChange(value: string | number | boolean | undefined): void {
  emit('update:filter', String(value) as PreviewFilter)
}
</script>

<style scoped>
.ledger-sync-preview {
  height: 420px;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>