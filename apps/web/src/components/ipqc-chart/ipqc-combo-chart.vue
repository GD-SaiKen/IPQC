<template>
  <div class="ipqc-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="柱线组合图">
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
        :key="`l${t.i}`"
        :x="P.l - 6"
        :y="t.y + 3.4"
        text-anchor="end"
        font-size="9.5"
        fill="#a8b6c7"
      >{{ t.left }}</text>
      <text
        v-for="t in ticks"
        :key="`r${t.i}`"
        :x="W - P.r + 6"
        :y="t.y + 3.4"
        font-size="9.5"
        fill="#c9a37a"
      >{{ t.right }}</text>

      <rect
        v-for="(v, i) in bars"
        :key="`b${i}`"
        :x="xAt(i) - barW / 2"
        :y="yBar(v)"
        :width="barW"
        :height="Math.max(1.5, ih - (yBar(v) - P.t))"
        rx="2"
        fill="#a9c3ea"
      >
        <title>{{ labels[i] }}：NG {{ v }} 批</title>
      </rect>
      <text
        v-for="(l, i) in labels"
        :key="`x${i}`"
        :x="xAt(i)"
        :y="H - 9"
        text-anchor="middle"
        font-size="9.5"
        fill="#8b9bb0"
      >{{ l }}</text>

      <polyline
        :points="linePoints"
        fill="none"
        stroke="#dc2626"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <g v-for="(v, i) in line" :key="`p${i}`">
        <circle
          :cx="xAt(i)"
          :cy="yLine(v)"
          r="3"
          fill="#fff"
          stroke="#dc2626"
          stroke-width="1.8"
        >
          <title>{{ labels[i] }}：批次不良率 {{ v }}%</title>
        </circle>
        <text
          :x="xAt(i)"
          :y="yLine(v) - 8"
          text-anchor="middle"
          font-size="9"
          fill="#c0392b"
        >{{ v }}</text>
      </g>
    </svg>
    <div class="ipqc-chart__legend">
      <span><i style="background: #a9c3ea" />NG 批次数（左轴）</span>
      <span><i style="background: #dc2626" />批次不良率 %（右轴）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    labels: string[]
    bars: number[]
    line: number[]
    height?: number
    width?: number
  }>(),
  { height: 258, width: 760 }
)

const W = computed(() => props.width)
const H = computed(() => props.height)
const P = { l: 38, r: 42, t: 14, b: 28 }
const iw = computed(() => W.value - P.l - P.r)
const ih = computed(() => H.value - P.t - P.b)

function niceMax(v: number): number {
  if (!v || v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  const s =
    n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10
  return s * p
}
function tickMax(raw: number): number {
  return niceMax(Math.max(1, raw) / 4) * 4
}
const maxB = computed(() => tickMax(Math.max(1, ...props.bars) * 1.06))
const maxL = computed(() => tickMax(Math.max(1, ...props.line) * 1.15))
const step = computed(() => iw.value / Math.max(1, props.labels.length))
const barW = computed(() => Math.max(8, step.value * 0.44))
const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((k) => ({
    i: k,
    y: P.t + (ih.value * k) / 4,
    left: Math.round(maxB.value * (1 - k / 4)),
    right: (maxL.value * (1 - k / 4)).toFixed(1),
  }))
)
const linePoints = computed(() =>
  props.line.map((v, i) => `${xAt(i)},${yLine(v)}`).join(' ')
)

function xAt(i: number): number {
  return P.l + step.value * (i + 0.5)
}
function yBar(v: number): number {
  return P.t + ih.value - (ih.value * v) / maxB.value
}
function yLine(v: number): number {
  return P.t + ih.value - (ih.value * v) / maxL.value
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
