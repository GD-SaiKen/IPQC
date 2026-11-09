<template>
  <div class="page-scroll">
    <IpqcSimpleTable title="点检排名（最近一次实测）" :data="rows" :columns="cols" />
    <p class="note">毛边适用项 1–9 月 40 分、10 月起 60 分；6 个责任区同一评分制，目标 100 分。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IpqcSimpleTable from '@/components/ipqc-simple-table/ipqc-simple-table.vue'
import { CHK_TARGET, chkLatest, chkScaleText } from '@/domain/ipqc/check'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()

const rows = computed(() =>
  [...WORKSHOPS]
    .map((w) => ({
      workshop: w.name,
      score: chkLatest(store.checkScores, w.key),
      scale: chkScaleText(w.key),
    }))
    .sort((a, b) => b.score - a.score)
)

const cols = [
  { prop: 'workshop', label: '责任区', width: 140 },
  { prop: 'score', label: `得分（目标 ${CHK_TARGET}）`, width: 140 },
  { prop: 'scale', label: '口径', minWidth: 200 },
]
</script>

<style scoped>
.note {
  font-size: 12px;
  color: #64748b;
}
</style>
