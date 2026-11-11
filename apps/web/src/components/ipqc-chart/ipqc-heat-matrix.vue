<template>
  <div class="mx-wrap">
    <table class="mx-table">
      <thead>
        <tr>
          <th class="mx-ws">车间 / 月份</th>
          <th v-for="m in months" :key="m" class="mx-num">{{ m }} 月</th>
          <th class="mx-num">全年</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td class="mx-ws">
            <button type="button" class="mx-enter" @click="emit('enter', row.key)">
              <i :style="{ background: colorOf(row.key) }" />{{ row.name }}
            </button>
          </td>
          <td
            v-for="(v, i) in row.cells"
            :key="`${row.key}-${i}`"
            class="mx-num"
            :style="cellStyle(v)"
          >{{ format(v) }}</td>
          <td class="mx-num mx-strong" :style="cellStyle(row.all)">{{ format(row.all) }}</td>
        </tr>
        <tr class="mx-total">
          <td class="mx-ws"><b>全厂合计</b></td>
          <td
            v-for="(v, i) in total.cells"
            :key="`total-${i}`"
            class="mx-num mx-strong"
            :style="cellStyle(v)"
          >{{ format(v) }}</td>
          <td class="mx-num mx-strong" :style="cellStyle(total.all)">{{ format(total.all) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mx-note">
      热力色阶在同一指标的<strong>全部车间与月份</strong>之间相对比较：深绿＝表现最好，红色＝最需关注；
      无数据格显示「—」。点左侧车间名进入该车间子工作台。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { heatOf, matrixRatio } from '@/domain/ipqc/trend'
import type { BoardMetric, MatrixData } from '@/domain/ipqc/trend'
import { fp } from '@/domain/ipqc/format'
import { WS_MAP } from '@/domain/ipqc/workshops'
import type { WorkshopKey } from '@/domain/ipqc/types'

const props = defineProps<{
  data: MatrixData
}>()

const emit = defineEmits<{ enter: [key: WorkshopKey] }>()

const months = computed(() => props.data.months)
const rows = computed(() => props.data.rows)
const total = computed(() => props.data.total)
const metric = computed<BoardMetric>(() => props.data.metric)
const allValues = computed(() => {
  const vals = [
    ...rows.value.flatMap((r) => r.cells.concat([r.all])),
    ...total.value.cells,
    total.value.all,
  ]
  return vals.filter((v): v is number => v != null && Number.isFinite(v))
})

function cellStyle(v: number | null) {
  const ratio = matrixRatio(v, metric.value, allValues.value)
  const h = heatOf(ratio)
  return { background: h.bg, color: h.fg }
}
function format(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return metric.value.unit === '%' ? fp(v, 1) : String(Math.round(v))
}
function colorOf(key: string): string {
  return WS_MAP[key]?.color || '#94a3b8'
}
</script>

<style scoped>
.mx-wrap {
  overflow-x: auto;
}
.mx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.mx-table th,
.mx-table td {
  padding: 7px 8px;
  border-bottom: 1px solid #edf1f6;
  text-align: center;
  white-space: nowrap;
}
.mx-table th {
  color: #64748b;
  font-weight: 600;
  background: #f8fafc;
}
.mx-ws {
  text-align: left;
  min-width: 120px;
}
.mx-num {
  font-variant-numeric: tabular-nums;
}
.mx-strong {
  font-weight: 700;
}
.mx-enter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: #1f2733;
  cursor: pointer;
}
.mx-enter:hover {
  color: #2563eb;
}
.mx-enter i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.mx-total td {
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
}
.mx-note {
  margin: 9px 0 0;
  font-size: 11.5px;
  color: #7a8494;
  line-height: 1.7;
}
</style>
