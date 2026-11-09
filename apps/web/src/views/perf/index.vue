<template>
  <IpqcSimpleTable title="绩效加减分明细（节选）" :data="rows" :columns="cols" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IpqcSimpleTable from '@/components/ipqc-simple-table/ipqc-simple-table.vue'
import { shortDept } from '@/domain/ipqc/format'
import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const rows = computed(() =>
  store.db.perf
    .filter((p) => shortDept(p.dept) === (store.workshop as WorkshopKey))
    .slice(0, 80)
)

const cols = [
  { prop: 'date', label: '日期', width: 100 },
  { prop: 'who', label: '姓名', width: 90 },
  { prop: 'attr', label: '维度', width: 90 },
  { prop: 'item', label: '事项', minWidth: 160 },
  { prop: 'score', label: '分值', width: 70 },
]
</script>
