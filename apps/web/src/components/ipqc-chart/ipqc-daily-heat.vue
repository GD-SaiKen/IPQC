<template>
  <div v-if="cells.length" class="day-grid">
    <div
      v-for="(d, i) in cells"
      :key="i"
      class="day-cell"
      :title="`第 ${d.m} 月 · ${d.s} 分`"
      :style="{
        background: dayColor(d.ratio),
        color: d.ratio > 0.8 ? '#fff' : '#5b6b80',
      }"
    >{{ d.s }}</div>
  </div>
  <div v-else class="empty">暂无日点检明细</div>
</template>

<script setup lang="ts">
import type { ChkDailyCell } from '@/domain/ipqc/check'

defineProps<{ cells: ChkDailyCell[] }>()

function dayColor(r: number): string {
  return r > 0.8 ? '#0f9d58' : r > 0.6 ? '#a7d8b6' : r > 0.4 ? '#fde2b8' : '#f8b4ae'
}
</script>

<style scoped>
.day-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.day-cell {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
}
.empty {
  padding: 18px 0;
  text-align: center;
  color: #a8b6c7;
  font-size: 12px;
}
</style>
