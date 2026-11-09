<template>
  <IpqcSimpleTable title="培训资料" :data="mats" :columns="matCols" />
  <IpqcSimpleTable title="培训实施" :data="trn" :columns="trnCols" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IpqcSimpleTable from '@/components/ipqc-simple-table/ipqc-simple-table.vue'
import { shortDept } from '@/domain/ipqc/format'
import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const ws = computed(() => store.workshop as WorkshopKey)

const mats = computed(() =>
  store.db.mat.filter(
    (m) => ws.value === '全部' || m.dept === '通用' || shortDept(String(m.dept)) === ws.value
  )
)
const trn = computed(() =>
  store.db.trn.filter((r) => ws.value === '全部' || shortDept(String(r.dept)) === ws.value)
)

const matCols = [
  { prop: 'name', label: '资料', minWidth: 160 },
  { prop: 'dept', label: '车间', width: 90 },
  { prop: 'type', label: '类型', width: 80 },
]
const trnCols = [
  { prop: 'date', label: '日期', width: 100 },
  { prop: 'topic', label: '主题', minWidth: 160 },
  { prop: 'num', label: '人次', width: 70 },
]
</script>
