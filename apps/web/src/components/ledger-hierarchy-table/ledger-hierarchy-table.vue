<template>
  <el-table
    :data="rows"
    row-key="id"
    border
    size="small"
    default-expand-all
    class="ledger-hierarchy-table"
    :tree-props="{ children: 'children' }"
  >
    <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
    <el-table-column prop="path" label="路径" min-width="240" show-overflow-tooltip />
    <el-table-column prop="rowType" label="类型" width="108">
      <template #default="{ row }">
        {{ row.rowType || rowTypeFallback(row) }}
      </template>
    </el-table-column>
    <el-table-column v-if="mode === 'preview'" prop="extension" label="扩展名" width="88">
      <template #default="{ row }">
        {{ row.kind === 'file' ? row.extension || '—' : '—' }}
      </template>
    </el-table-column>
    <el-table-column v-if="mode === 'preview'" label="状态" width="96">
      <template #default="{ row }">
        {{ row.kind === 'file' ? statusLabel(row.status) : fileCountLabel(row) }}
      </template>
    </el-table-column>
    <el-table-column v-if="mode === 'preview'" prop="reason" label="原因" min-width="160" show-overflow-tooltip>
      <template #default="{ row }">
        {{ row.kind === 'file' ? row.reason || '—' : '—' }}
      </template>
    </el-table-column>
    <el-table-column v-if="mode === 'preview'" prop="label" label="角色" min-width="120" show-overflow-tooltip>
      <template #default="{ row }">
        {{ row.kind === 'file' ? row.label || '—' : '—' }}
      </template>
    </el-table-column>
    <el-table-column v-if="mode === 'preview'" prop="modifiedAt" label="修改时间" width="168">
      <template #default="{ row }">
        {{ row.kind === 'file' ? row.modifiedAt || '—' : '—' }}
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import type { HierarchyRow } from '@/views/data/ledger-selection'
import { STATUS_LABELS } from '@/views/data/ledger-selection'

withDefaults(
  defineProps<{
    rows: HierarchyRow[]
    mode?: 'selection' | 'preview'
  }>(),
  {
    mode: 'selection',
  },
)

function statusLabel(status?: string): string {
  if (!status) {
    return '—'
  }
  return STATUS_LABELS[status] ?? status
}

function rowTypeFallback(row: HierarchyRow): string {
  if (row.kind === 'directory') {
    return '目录'
  }
  if (row.kind === 'hint') {
    return '说明'
  }
  return '文件'
}

function countFileLeaves(row: HierarchyRow): number {
  let total = row.kind === 'file' ? 1 : 0
  for (const child of row.children ?? []) {
    total += countFileLeaves(child)
  }
  return total
}

function fileCountLabel(row: HierarchyRow): string {
  if (row.kind !== 'directory') {
    return '—'
  }
  return `${countFileLeaves(row)} 个文件`
}
</script>