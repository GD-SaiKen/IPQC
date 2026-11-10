<template>
  <div class="donut">
    <svg viewBox="0 0 180 180" role="img" :aria-label="unit">
      <circle
        v-for="(it, i) in arcs"
        :key="`${it.label}-${i}`"
        cx="90"
        cy="90"
        r="54"
        fill="none"
        :stroke="it.color"
        stroke-width="17"
        :stroke-dasharray="`${Math.max(0, it.len - 1.5)} ${C - it.len + 1.5}`"
        :stroke-dashoffset="-it.offset"
        transform="rotate(-90 90 90)"
      >
        <title>{{ it.label }}：{{ it.value }}（{{ it.pct.toFixed(1) }}%）</title>
      </circle>
      <text x="90" y="86" text-anchor="middle" font-size="21" font-weight="700" fill="#101a29">
        {{ total }}
      </text>
      <text x="90" y="103" text-anchor="middle" font-size="10" fill="#8b9bb0">
        {{ unit }}
      </text>
    </svg>
    <div class="donut__legend">
      <div v-for="it in arcs" :key="it.label" class="donut__item">
        <i :style="{ background: it.color }" />
        <span class="donut__label">{{ it.label }}</span>
        <b>{{ it.value }}</b>
        <span class="donut__pct">{{ it.pct.toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface DonutItem {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{ items: DonutItem[]; unit?: string }>(),
  { unit: '总量' }
)

const C = 2 * Math.PI * 54
const total = computed(() => props.items.reduce((a, b) => a + b.value, 0) || 1)
const arcs = computed(() => {
  let acc = 0
  return props.items.map((it) => {
    const len = (it.value / total.value) * C
    const out = {
      ...it,
      len,
      offset: acc,
      pct: (it.value / total.value) * 100,
    }
    acc += len
    return out
  })
})
</script>

<style scoped>
.donut {
  display: flex;
  gap: 14px;
  align-items: center;
}
.donut > svg {
  width: 150px;
  height: 150px;
  flex: 0 0 150px;
}
.donut__legend {
  flex: 1;
  min-width: 0;
}
.donut__item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  font-size: 11.5px;
  color: #46586e;
}
.donut__item i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  flex: none;
}
.donut__label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.donut__item b {
  font-variant-numeric: tabular-nums;
}
.donut__pct {
  width: 46px;
  text-align: right;
  color: #a8b6c7;
}
</style>
