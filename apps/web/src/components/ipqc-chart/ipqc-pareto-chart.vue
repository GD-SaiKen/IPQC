<template>
  <div class="ipqc-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="不良项目柏拉图">
      <line
        v-for="t in ticks"
        :key="`g${t.i}`"
        :x1="P.l"
        :y1="t.y"
        :x2="W - P.r"
        :y2="t.y"
        stroke="#eef2f8"
      />
      <text
        v-for="t in ticks"
        :key="`l${t.i}`"
        :x="P.l - 7"
        :y="t.y + 3.6"
        text-anchor="end"
        font-size="10"
        fill="#a8b6c7"
      >{{ t.label }}</text>
      <text
        v-for="p in [0, 25, 50, 75, 100]"
        :key="`r${p}`"
        :x="W - P.r + 7"
        :y="yPct(p) + 3.6"
        font-size="10"
        fill="#c9a37a"
      >{{ p }}%</text>

      <line
        :x1="P.l"
        :y1="yPct(80)"
        :x2="W - P.r"
        :y2="yPct(80)"
        stroke="#f59e0b"
        stroke-width="1.2"
        stroke-dasharray="5 4"
      />
      <text
        :x="P.l + iw * 0.62"
        :y="yPct(80) - 7"
        text-anchor="middle"
        font-size="10"
        fill="#b45309"
        style="paint-order: stroke; stroke: #fff; stroke-width: 3.5"
      >80% 关键少数线</text>

      <g v-for="(it, i) in arranged" :key="`bar${i}`">
        <rect
          :x="xAt(i) - barW / 2"
          :y="yCnt(it.cnt)"
          :width="barW"
          :height="Math.max(1.5, ih - (yCnt(it.cnt) - P.t))"
          rx="2"
          :fill="colorOf(it, i)"
        >
          <title>{{ it.n }}：{{ it.cnt }} 项次（累计 {{ cumulative[i].toFixed(1) }}%）</title>
        </rect>
        <text
          :x="xAt(i)"
          :y="yCnt(it.cnt) - 5"
          text-anchor="middle"
          font-size="10.5"
          fill="#7d8ea3"
        >{{ it.cnt }}</text>
        <text
          :x="xAt(i)"
          :y="P.t + ih + 14"
          :transform="`rotate(-45 ${xAt(i)} ${P.t + ih + 14})`"
          text-anchor="end"
          font-size="11.5"
          fill="#7d8ea3"
        >{{ shortName(it.n) }}</text>
      </g>

      <polyline
        :points="cumPoints"
        fill="none"
        stroke="#1d4ed8"
        stroke-width="1.8"
      />
      <circle
        v-for="(p, i) in cumulative"
        :key="`c${i}`"
        :cx="xAt(i)"
        :cy="yPct(p)"
        r="3"
        fill="#fff"
        stroke="#1d4ed8"
        stroke-width="1.6"
      >
        <title>累计 {{ p.toFixed(1) }}%</title>
      </circle>
    </svg>
    <div class="ipqc-chart__legend">
      <span><i style="background: #dc2626" />TOP3 不良项</span>
      <span><i style="background: #ea8a3c" />第 4–6 项</span>
      <span><i style="background: #1d4ed8" />累计占比 %</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ParetoItem {
  n: string
  cnt: number
  rest?: boolean
}

const props = withDefaults(
  defineProps<{
    items: ParetoItem[]
    top?: number
    height?: number
    width?: number
  }>(),
  { top: 99, height: 400, width: 1120 }
)

const W = computed(() => props.width)
const H = computed(() => props.height)
const P = { l: 40, r: 44, t: 20, b: 96 }
const iw = computed(() => W.value - P.l - P.r)
const ih = computed(() => H.value - P.t - P.b)

const arranged = computed<ParetoItem[]>(() => {
  const head = props.items.slice(0, props.top)
  const rest = props.items.slice(props.top)
  if (!rest.length) return head
  return [
    ...head,
    { n: `其余 ${rest.length} 项`, cnt: rest.reduce((a, b) => a + b.cnt, 0), rest: true },
  ]
})
const total = computed(() => arranged.value.reduce((a, b) => a + b.cnt, 0) || 1)
const cumulative = computed(() => {
  let acc = 0
  return arranged.value.map((it) => {
    acc += it.cnt
    return (acc / total.value) * 100
  })
})
const maxB = computed(() => {
  const m = Math.max(1, ...arranged.value.map((x) => x.cnt))
  return Math.ceil((m * 1.02) / 4) * 4
})
const step = computed(() => iw.value / Math.max(1, arranged.value.length))
const barW = computed(() => Math.min(46, step.value * 0.6))
const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((k) => ({
    i: k,
    y: P.t + (ih.value * k) / 4,
    label: String(Math.round(maxB.value * (1 - k / 4))),
  }))
)
const cumPoints = computed(() =>
  cumulative.value.map((p, i) => `${xAt(i)},${yPct(p)}`).join(' ')
)

function xAt(i: number): number {
  return P.l + step.value * (i + 0.5)
}
function yCnt(v: number): number {
  return P.t + ih.value - (ih.value * v) / maxB.value
}
function yPct(p: number): number {
  return P.t + ih.value - (ih.value * p) / 100
}
function colorOf(it: ParetoItem, i: number): string {
  if (it.rest) return '#cbd5e1'
  return i < 3 ? '#dc2626' : i < 6 ? '#ea8a3c' : '#9db6d6'
}
function shortName(n: string): string {
  return n.length > 9 ? `${n.slice(0, 9)}…` : n
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
