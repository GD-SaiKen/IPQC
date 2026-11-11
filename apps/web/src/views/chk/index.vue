<template>
  <div class="page-scroll">
    <div class="chk-head">
      <h2>关键点检排名</h2>
      <span class="muted small">
        6 个责任区同一套表、同一套规则；目标 {{ CHK_TARGET }} 分，全表满分 {{ CHK_FULL }} 分。
      </span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">参评责任区</div>
        <div class="value">{{ stats.zones }}</div>
        <div class="muted small">最近一次实测分</div>
      </div>
      <div class="kpi-card">
        <div class="label">最高分</div>
        <div class="value">{{ stats.max ? fmtScore(stats.max.latest) : '—' }}</div>
        <div class="muted small">{{ stats.max ? wsName(stats.max.key) : '—' }}</div>
      </div>
      <div class="kpi-card" :class="stats.min && stats.min.latest < 90 ? 'dan' : ''">
        <div class="label">最低分</div>
        <div class="value">{{ stats.min ? fmtScore(stats.min.latest) : '—' }}</div>
        <div class="muted small">{{ stats.min ? wsName(stats.min.key) : '—' }}</div>
      </div>
      <div class="kpi-card" :class="stats.passRate < 100 ? 'warn' : ''">
        <div class="label">达标率</div>
        <div class="value">{{ fmtPct(stats.passRate) }}</div>
        <div class="muted small">
          含毛边 {{ passCount }}/{{ stats.zones }} · 剔除毛边 {{ passEx }}/{{ zonesEx }}
        </div>
      </div>
    </div>

    <SectionCard title="责任区排名" subtitle="按最近一次实测分 · 单元格只读">
      <div class="table-wrap">
        <table class="rank-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>责任区</th>
              <th>负责人</th>
              <th>最近得分</th>
              <th>达标</th>
              <th>适用满分</th>
              <th>月趋势</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in rank"
              :key="r.key"
              :class="{ 'is-current': r.key === activeZone }"
              @click="setZone(r.key)"
            >
              <td class="rank-no">{{ i + 1 }}</td>
              <td class="rank-ws">
                <i :style="{ background: WS_MAP[r.key]?.color }" />{{ wsName(r.key) }}
              </td>
              <td>{{ WS_MAP[r.key]?.owner || '—' }}</td>
              <td class="num" :class="scoreTone(r.latest)">{{ fmtScore(r.latest) }}</td>
              <td>
                <span class="badge" :class="r.latest >= CHK_TARGET ? 'ok' : 'warn'">
                  {{ r.latest >= CHK_TARGET ? '达标' : '未达标' }}
                </span>
              </td>
              <td class="num">{{ r.max }} 分</td>
              <td class="spark-cell">
                <IpqcSparkline :data="r.trend" :color="WS_MAP[r.key]?.color" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="foot-note">
        注塑毛边适用项：1–9 月合计 40 分、10 月起 60 分，<b>不折算</b>；分数偏低来自适用项少，
        达标仍看是否 ≥{{ CHK_TARGET }}。总看板取所选月或 1–10 月均值，本页取最近一次实测分，两者允许不同。
      </p>
    </SectionCard>

    <div class="grid-2">
      <SectionCard :title="`${wsName(activeZone)} · 1–10 月趋势`" subtitle="最近一次与月均对比">
        <IpqcLineChart :labels="monthLabels" :series="zoneTrend" :height="230" />
        <p class="foot-note">{{ chkScaleText(activeZone) }}</p>
      </SectionCard>

      <SectionCard title="最近 30 条日点检" subtitle="颜色越绿越接近适用满分">
        <IpqcDailyHeat :cells="dailyCells" />
        <p class="foot-note">
          {{ wsName(activeZone) }} 日点检色块；颜色按该月适用满分归一，不把毛边低分当成异常。
        </p>
      </SectionCard>
    </div>

    <SectionCard title="点检项明细" subtitle="切责任区查看标准项、分值、最近实测">
      <div class="zone-tabs">
        <button
          v-for="w in WORKSHOPS"
          :key="w.key"
          type="button"
          class="zone-tab"
          :class="{ on: activeZone === w.key }"
          @click="activeZone = w.key"
        >
          <i :style="{ background: w.color }" />{{ w.name }}
        </button>
      </div>

      <div v-if="itemRows.length" class="table-wrap">
        <table class="item-table">
          <thead>
            <tr>
              <th>类别</th>
              <th>点检项</th>
              <th>标准分值</th>
              <th>最近实测</th>
              <th>达成率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, i) in itemRows" :key="i">
              <td>{{ it.category || '基础项' }}</td>
              <td>{{ it.item }}</td>
              <td class="num">{{ it.score }}</td>
              <td class="num">{{ it.last == null ? '—' : it.last }}</td>
              <td class="num" :class="it.rate != null && it.rate < 100 ? 'warn-text' : ''">
                {{ it.rate == null ? '—' : `${fp(it.rate, 0)}%` }}
              </td>
            </tr>
          </tbody>
        </table>
        <p class="foot-note">
          标准项合计 {{ itemTotal }} 分。全表 {{ CHK_FULL }} 分含加分项，可超 100 分；
          {{ wsName(activeZone) }} 最近实测 {{ fmtScore(chkLatest(store.checkScores, activeZone)) }}。
        </p>
      </div>
      <p v-else class="muted small">
        该责任区暂无逐项清单（仅注塑车间有项级实测数据）；评分口径见上方脚注。
      </p>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcLineChart from '@/components/ipqc-chart/ipqc-line-chart.vue'
import IpqcSparkline from '@/components/ipqc-chart/ipqc-sparkline.vue'
import IpqcDailyHeat from '@/components/ipqc-chart/ipqc-daily-heat.vue'
import {
  CHK_APPLY,
  CHK_FULL,
  CHK_TARGET,
  CHECK_DAILY,
  CHECK_ITEM_SCORES,
  chkDailyCells,
  chkItemRows,
  chkItemTotal,
  chkLatest,
  chkRank,
  chkScaleText,
  chkStats,
  chkTrend,
} from '@/domain/ipqc/check'
import { fp } from '@/domain/ipqc/format'
import { MONTHS, WORKSHOPS, WS_MAP } from '@/domain/ipqc/workshops'
import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()

const zones = WORKSHOPS.map((w) => w.key)
const rank = computed(() => chkRank(store.checkScores, zones))
const stats = computed(() => chkStats(store.checkScores, zones))

const passCount = computed(() => rank.value.filter((r) => r.latest >= CHK_TARGET).length)
const zonesEx = computed(() => zones.filter((z) => !CHK_APPLY[z]).length)
const passEx = computed(
  () =>
    rank.value.filter((r) => !CHK_APPLY[r.key] && r.latest >= CHK_TARGET).length
)

const activeZone = ref<WorkshopKey>(
  store.workshop === '全部' ? '注塑' : (store.workshop as WorkshopKey)
)
watch(
  () => store.workshop,
  (ws) => {
    if (ws !== '全部') activeZone.value = ws as WorkshopKey
  }
)

const monthLabels = MONTHS.map((m) => `${m}月`)
const zoneTrend = computed(() => [
  {
    name: wsName(activeZone.value),
    color: WS_MAP[activeZone.value]?.color || '#2563eb',
    data: chkTrend(store.checkScores, activeZone.value),
    area: true,
  },
])

const dailyCells = computed(() =>
  chkDailyCells(store.checkScores, CHECK_DAILY[activeZone.value] || [], activeZone.value)
)
const itemRows = computed(() =>
  chkItemRows(activeZone.value, CHECK_ITEM_SCORES[activeZone.value] || null)
)
const itemTotal = computed(() => chkItemTotal(activeZone.value))

function setZone(k: string): void {
  if (WS_MAP[k]) activeZone.value = k as WorkshopKey
}
function wsName(k: string): string {
  return WS_MAP[k]?.name || k
}
function fmtScore(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)} 分`
}
function fmtPct(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)}%`
}
function scoreTone(v: number): string {
  return v < 90 ? 'dan-text' : v < CHK_TARGET ? 'warn-text' : 'ok-text'
}
</script>

<style scoped>
.chk-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.chk-head h2 {
  margin: 0;
  font-size: 17px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
}
.table-wrap {
  overflow-x: auto;
}
.rank-table,
.item-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.rank-table th,
.rank-table td,
.item-table th,
.item-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #edf1f6;
  text-align: left;
  white-space: nowrap;
}
.rank-table th,
.item-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}
.rank-table tbody tr {
  cursor: pointer;
}
.rank-table tbody tr:hover {
  background: #f7faff;
}
.rank-table tbody tr.is-current {
  background: #eef4ff;
}
.rank-no {
  width: 48px;
  color: #7a8494;
}
.rank-ws i,
.zone-tab i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 7px;
}
.num {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}
.ok-text {
  color: #0b7a45;
  font-weight: 600;
}
.warn-text {
  color: #b45309;
}
.dan-text {
  color: #b91c1c;
  font-weight: 600;
}
.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
}
.badge.ok {
  background: #e5f6ec;
  color: #0b7a45;
}
.badge.warn {
  background: #fdf5df;
  color: #a16207;
}
.spark-cell {
  width: 100px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 14px;
}
.zone-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.zone-tab {
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 12px;
  color: #566070;
  cursor: pointer;
}
.zone-tab.on {
  background: #3b6fe0;
  border-color: #3b6fe0;
  color: #fff;
}
.foot-note {
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: #7a8494;
}
</style>
