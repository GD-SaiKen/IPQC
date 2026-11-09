<template>
  <div class="page-scroll">
    <div v-if="meta" class="kpi-grid">
      <div class="kpi-card">
        <div class="label">检验批次</div>
        <div class="value">{{ meta.lots }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">NG 批</div>
        <div class="value">{{ meta.ng }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">批次不良率</div>
        <div class="value">{{ rate }}%</div>
      </div>
    </div>
    <IpqcSimpleTable title="柏拉图 TOP" :data="paretoRows" :columns="paretoCols" />
    <IpqcSimpleTable title="NG 批次（节选）" :data="ngRows" :columns="ngCols" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IpqcSimpleTable from '@/components/ipqc-simple-table/ipqc-simple-table.vue'
import { aggFqc, fqcKeysOf } from '@/domain/ipqc/fqc'
import { fp, pct } from '@/domain/ipqc/format'
import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const key = computed(() => store.workshop as WorkshopKey)
const book = computed(() => aggFqc(fqcKeysOf(key.value)))
const meta = computed(() => book.value?.meta as { lots: number; ng: number } | undefined)
const rate = computed(() => (meta.value ? fp(pct(meta.value.ng, meta.value.lots), 2) : '—'))

const paretoRows = computed(() => (book.value?.pareto || []).slice(0, 12) as Record<string, unknown>[])
const paretoCols = [
  { prop: 'n', label: '不良描述', minWidth: 160 },
  { prop: 'cnt', label: '项次', width: 80 },
]

const ngRows = computed(() =>
  (store.db.fqcNg as Record<string, unknown>[])
    .filter((r) => fqcKeysOf(key.value).includes(String(r.ws)))
    .slice(0, 50)
)
const ngCols = [
  { prop: 'd', label: '日期', width: 100 },
  { prop: 'pn', label: '料号', width: 120 },
  { prop: 'issue', label: '不良', minWidth: 140 },
]
</script>
