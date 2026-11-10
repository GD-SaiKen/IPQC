<template>
  <div class="ipqc-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="ariaLabel">
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
      <g v-for="s in series" :key="s.name">
        <polygon
          v-if="s.area && points(s.data).length"
          :points="areaPoints(s.data)"
          :fill="s.color"
          opacity=".07"
        />
        <polyline
          :points="points(s.data)"
          fill="none"
          :stroke="s.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="(v, i) in s.data"
          v-show="v != null"
          :key="`${s.name}-${i}`"
          :cx="xAt(i)"
          :cy="yAt(v)"
          r="2.7"
          fill="#fff"
          :stroke="s.color"
          stroke-width="1.8"
        >
          <title>{{ labels[i] }} · {{ s.name }}：{{ v }}</title>
        </circle>
      </g>
      <text
        v-for="(l, i) in labels"
        :key="`x${i}`"
        :x="xAt(i)"
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

export interface LineSeries {
  name: string
  color: string
  data: (number | null)[]
  area?: boolean
}

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: LineSeries[]
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
const maxV = computed(() => {
  const vals = props.series.flatMap((s) =>
    s.data.filter((v): v is number => v != null)
  )
  return props.max || Math.max(1, ...(vals.length ? vals : [1]))
})
const ariaLabel = computed(
  () => `折线图：${props.series.map((s) => s.name).join('、')}`
)
const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((k) => ({
    i: k,
    y: P.t + (ih.value * k) / 4,
    label: String(Math.round(maxV.value * (1 - k / 4))),
  }))
)

function xAt(i: number): number {
  return props.labels.length > 1
    ? P.l + (iw.value * i) / (props.labels.length - 1)
    : P.l + iw.value / 2
}
function yAt(v: number | null): number {
  return P.t + ih.value - (ih.value * (v ?? 0)) / maxV.value
}
function points(data: (number | null)[]): string {
  return data
    .map((v, i) => (v == null ? '' : `${xAt(i)},${yAt(v)}`))
    .filter(Boolean)
    .join(' ')
}
function areaPoints(data: (number | null)[]): string {
  const pts = data
    .map((v, i) => (v == null ? '' : `${xAt(i)},${yAt(v)}`))
    .filter(Boolean)
  if (!pts.length) return ''
  return `${P.l},${P.t + ih.value} ${pts.join(' ')} ${xAt(data.length - 1)},${P.t + ih.value}`
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
