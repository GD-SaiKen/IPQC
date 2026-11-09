<template>
  <IpqcSimpleTable
    title="投诉闭环台账"
    :data="rows"
    :columns="cols"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IpqcSimpleTable from '@/components/ipqc-simple-table/ipqc-simple-table.vue'
import { shortDept } from '@/domain/ipqc/format'
import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const rows = computed(() =>
  store.db.cmp.filter((c) => shortDept(c.dept) === (store.workshop as WorkshopKey))
)

const cols = [
  { prop: 'date', label: '日期', width: 100 },
  { prop: 'from', label: '投诉部门', width: 100 },
  { prop: 'part', label: '零件', width: 100 },
  { prop: 'pn', label: '料号', width: 110 },
  { prop: 'issue', label: '问题', minWidth: 140 },
  { prop: 'owner', label: '责任人', width: 90 },
  { prop: 'actClose', label: '结案日', width: 100 },
]
</script>
