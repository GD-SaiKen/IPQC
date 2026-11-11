<template>
  <div class="ipqc-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="ariaLabel">
      <g>
        <line
          v-for="t in ticks"
          :key="`g${t.i}`"
          :x1="P.l"
          :y1="t.y"
          :x2="W - P.r"
          :y2="t.y"
          stroke="#eef2f8"
          stroke-width="1"
        />
        <text
          v-for="t in ticks"
          :key="`t${t.i}`"
          :x="P.l - 7"
          :y="t.y + 3.4"
          text-anchor="end"
          font-size="9.5"
          fill="#a8b6c7"
        >{{ t.label }}</text>
      </g>
      <g v-if="series.length > 1">
        <rect
          v-for="i in labels.length"
          v-show="(i - 1) % 2 === 1"
          :key="`z${i}`"
          :x="P.l + clusterW * (i - 1)"
          :y="P.t"
          :width="clusterW"
          :height="ih"
          fill="#f4f7fb"
        />
      </g>
      <g v-for="(s, si) in series" :key="s.name">
        <rect
          v-for="(v, i) in s.data"
          v-show="v != null"
          :key="`b${si}-${i}`"
          :x="barX(i, si)"
          :y="barY(v)"
          :width="barW"
          :height="barH(v)"
          rx="1.5"
          :fill="s.color"
        >
          <title>{{ labels[i] }} · {{ s.name }}：{{ v }}</title>
        </rect>
      </g>
      <text
        v-for="(l, i) in labels"
        :key="`x${i}`"
        :x="centerX(i)"
        :y="H - 7"
        text-anchor="middle"
        font-size="9.5"
        fill="#8b9bb0"
      >{{ l }}</text>
    </svg>
    <div v-if="series.length > 1" class="ipqc-chart__legend">
      <span v-for="s in series" :key="s.name">
        <i :style="{ background: s.color }" />{{ s.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface BarSeries {
  name: string
  color: string
  data: (number | null)[]
}

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: BarSeries[]
    height?: number
    max?: number
    width?: number
  }>(),
  { height: 238, width: 880, max: 0 }
)

const W = computed(() => props.width)
const H = computed(() => props.height)
const P = { l: 34, r: 12, t: 12, b: 26 }
const iw = computed(() => W.value - P.l - P.r)
const ih = computed(() => H.value - P.t - P.b)
const allValues = computed(() =>
  props.series.flatMap((s) => s.data.filter((v): v is number => v != null))
)
const maxV = computed(
  () => props.max || Math.max(1, ...(allValues.value.length ? allValues.value : [1]))
)
const clusterW = computed(() =>
  props.labels.length > 1 ? iw.value / props.labels.length : iw.value
)
const groupPad = computed(() =>
  props.series.length > 1 ? clusterW.value * 0.26 : clusterW.value * 0.45
)
const barW = computed(() => {
  const usable = clusterW.value - groupPad.value
  const n = props.series.length || 1
  return Math.max(1, (usable - (n - 1)) / n)
})
const ariaLabel = computed(
  () => `柱状图：${props.series.map((s) => s.name).join('、')}`
)

const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((k) => {
    const y = P.t + (ih.value * k) / 4
    return {
      i: k,
      y,
      label: String(Math.round(maxV.value * (1 - k / 4))),
    }
  })
)

function centerX(i: number): number {
  return props.labels.length > 1
    ? P.l + clusterW.value * i + clusterW.value / 2
    : P.l + iw.value / 2
}

function barX(i: number, si: number): number {
  const cx = centerX(i)
  const n = props.series.length
  return cx - (barW.value * n + (n - 1)) / 2 + si * (barW.value + 1)
}

function barY(v: number | null): number {
  const val = v ?? 0
  return P.t + ih.value - barH(val)
}

function barH(v: number | null): number {
  const val = v ?? 0
  return Math.max(1.5, (ih.value * val) / maxV.value)
}
</script>

<style scoped>
.ipqc-chart svg {
  display: block;
  width: 100%;
  height: auto;
}
.ipqc-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 11.5px;
  color: #46586e;
}
.ipqc-chart__legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ipqc-chart__legend i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
</style>
