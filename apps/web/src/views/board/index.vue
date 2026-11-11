<template>
  <div class="page-scroll">
    <div class="board-head no-print">
      <div>
        <h2>2026 年 {{ mLabel(store.boardMonth) }} · 前制程质量总看板</h2>
        <p class="muted small">六项指标按月汇总；点车间行或热力矩阵左侧车间名进入该车间子工作台。</p>
      </div>
      <el-radio-group v-model="month" size="small">
        <el-radio-button :value="0">全年</el-radio-button>
        <el-radio-button v-for="m in MONTHS" :key="m" :value="m">{{ m }} 月</el-radio-button>
      </el-radio-group>
    </div>

    <div class="kpi-grid">
      <div v-for="k in headline" :key="k.label" class="kpi-card" :class="k.cls">
        <div class="label">{{ k.label }}</div>
        <div class="value">{{ k.value }}</div>
        <div class="muted small">{{ k.hint }}</div>
      </div>
    </div>

    <SectionCard title="车间 KPI 对比" subtitle="点任一行进入车间总览">
      <div class="table-wrap">
        <table class="kpi-table">
          <thead>
            <tr>
              <th class="col-ws">车间</th>
              <th>负责人</th>
              <th>首件合格率</th>
              <th>终检不良率</th>
              <th>投诉批</th>
              <th>结案率</th>
              <th>点检得分</th>
              <th>绩效均分</th>
              <th>培训人次</th>
              <th>综合达成</th>
              <th class="no-print">进入</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.key" class="row-link" @click="enterWorkshop(r.key)">
              <td class="col-ws">
                <i class="wsdot" :style="{ background: r.color }" />{{ r.name }}
              </td>
              <td>{{ r.owner }}</td>
              <td :class="faTone(r.k.faOK)">{{ fmtPct(r.k.faOK) }}</td>
              <td :class="fqcTone(r.k.fqcRate)">{{ fmtPct(r.k.fqcRate, 2) }}</td>
              <td>{{ r.k.cmpN || '—' }}</td>
              <td :class="closeTone(r.k.cmpClose)">{{ fmtPct(r.k.cmpClose) }}</td>
              <td :class="chkTone(r.k.chk)">{{ fmtScore(r.k.chk) }}</td>
              <td :class="perfTone(r.k.perf)">{{ fmtScore(r.k.perf) }}</td>
              <td>{{ r.k.trnP || '—' }}</td>
              <td :class="achTone(r.achRate)">{{ r.ach }}</td>
              <td class="no-print">
                <el-button link type="primary" @click.stop="enterWorkshop(r.key)">进入 →</el-button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="col-ws"><b>全厂合计</b></td>
              <td class="muted">—</td>
              <td :class="faTone(summary.faOK)">{{ fmtPct(summary.faOK) }}</td>
              <td :class="fqcTone(summary.fqcRate)">{{ fmtPct(summary.fqcRate, 2) }}</td>
              <td>{{ summary.cmpN || '—' }}</td>
              <td :class="closeTone(summary.cmpClose)">{{ fmtPct(summary.cmpClose) }}</td>
              <td :class="chkTone(summary.chkAvg)">{{ fmtScore(summary.chkAvg) }}</td>
              <td :class="perfTone(summary.perf)">{{ fmtScore(summary.perf) }}</td>
              <td>{{ summary.trnP || '—' }}</td>
              <td>{{ allAchieved }}</td>
              <td class="no-print" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="foot-note">
        全厂合计直接用全量记录计算，不把 6 个车间数字简单相加冒充全厂。综合达成＝
        首件合格率 ≥95%、终检批次不良率 ≤3%、投诉结案率 ≥95%、点检 ≥100 分、绩效 ≥100 分
        五项中达标项数 / 有数据项数。点检全厂均值含注塑毛边；<b>剔除毛边 {{ fmtScore(summary.chkAvgEx) }}</b>
        （毛边适用项 1–9 月 40 分、10 月起 60 分，不折算）。数据缺失显示「—」，不按 0 处理。
      </p>
    </SectionCard>

    <SectionCard title="月度热力矩阵" subtitle="车间 × 月份">
      <div class="metric-tabs no-print">
        <button
          v-for="m in BOARD_METRICS"
          :key="m.k"
          type="button"
          class="metric-tab"
          :class="{ on: metricKey === m.k }"
          @click="metricKey = m.k"
        >{{ m.name }}</button>
      </div>
      <IpqcHeatMatrix :data="matrix" @enter="enterWorkshop" />
    </SectionCard>

    <div class="trend-grid">
      <SectionCard title="投诉批次走势" subtitle="1–10 月 · 按责任车间">
        <IpqcLineChart :labels="monthLabels" :series="cmpTrend" :height="230" />
      </SectionCard>
      <SectionCard title="点检得分走势" subtitle="1–10 月 · 所选月或均值">
        <IpqcLineChart :labels="monthLabels" :series="chkTrendData" :height="230" />
      </SectionCard>
    </div>

    <SectionCard v-if="alerts.length" title="异常关注" subtitle="按优先级排序，点击进入责任车间">
      <div class="alert-list">
        <button
          v-for="(a, i) in alerts"
          :key="i"
          type="button"
          class="alert-item"
          :class="a.lv"
          @click="a.ws && enterWorkshop(a.ws)"
        >
          <i class="alert-dot" />
          <span class="alert-title">{{ a.t }}</span>
          <span class="alert-desc">{{ a.d }}</span>
          <span class="alert-go">进入 →</span>
        </button>
      </div>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcHeatMatrix from '@/components/ipqc-chart/ipqc-heat-matrix.vue'
import IpqcLineChart from '@/components/ipqc-chart/ipqc-line-chart.vue'
import { useWorkshopRoute } from '@/composables/use-workshop-route'
import { fp } from '@/domain/ipqc/format'
import { allKpi, boardAlerts, wsKpi } from '@/domain/ipqc/kpi'
import { BOARD_METRICS, boardMatrix, checkTrend, complaintTrend } from '@/domain/ipqc/trend'
import { mLabel, MONTHS, WORKSHOPS } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const { enterWorkshop } = useWorkshopRoute()

const month = computed({
  get: () => store.boardMonth,
  set: (v: number) => store.setBoardMonth(v),
})

const summary = computed(() => allKpi(store.db, store.checkScores, store.boardMonth))
const alerts = computed(() => boardAlerts(store.db, store.checkScores, store.boardMonth))

const rows = computed(() =>
  WORKSHOPS.map((w) => {
    const k = wsKpi(store.db, store.checkScores, w.key, store.boardMonth)
    const checks = [
      k.faOK != null ? k.faOK >= 95 : null,
      k.fqcRate != null ? k.fqcRate <= 3 : null,
      k.cmpClose != null ? k.cmpClose >= 95 : null,
      k.chk != null ? k.chk >= 100 : null,
      k.perf != null ? k.perf >= 100 : null,
    ].filter((x): x is boolean => x != null)
    const hit = checks.filter(Boolean).length
    return {
      key: w.key,
      name: w.name,
      owner: w.owner,
      color: w.color,
      k,
      ach: checks.length ? `${hit}/${checks.length}` : '—',
      achRate: checks.length ? hit / checks.length : null,
    }
  })
)

const allAchieved = computed(() => {
  const a = summary.value
  const checks = [
    a.faOK != null ? a.faOK >= 95 : null,
    a.fqcRate != null ? a.fqcRate <= 3 : null,
    a.cmpClose != null ? a.cmpClose >= 95 : null,
    a.chkAvg != null ? a.chkAvg >= 100 : null,
    a.perf != null ? a.perf >= 100 : null,
  ].filter((x): x is boolean => x != null)
  return checks.length ? `${checks.filter(Boolean).length}/${checks.length}` : '—'
})

const headline = computed(() => {
  const a = summary.value
  return [
    { label: '首件合格率', value: fmtPct(a.faOK), hint: `${a.faN} 批 · NG ${a.faNg} 批`, cls: faTone(a.faOK) },
    {
      label: '终检批次不良率',
      value: fmtPct(a.fqcRate, 2),
      hint: `目标 ≤3% · ${a.fqcLots} 批`,
      cls: fqcTone(a.fqcRate),
    },
    {
      label: '投诉结案率',
      value: fmtPct(a.cmpClose),
      hint: `${a.cmpN} 批 · 未结 ${a.cmpOpen} 批`,
      cls: closeTone(a.cmpClose),
    },
    {
      label: '点检均值',
      value: fmtScore(a.chkAvg),
      hint: `剔除毛边 ${fmtScore(a.chkAvgEx)} · 达标 ${a.chkOK}/${a.chkTotal}`,
      cls: chkTone(a.chkAvg),
    },
    { label: '绩效均分', value: fmtScore(a.perf), hint: `${a.perfN} 人 · 基准 100`, cls: perfTone(a.perf) },
    { label: '培训人次', value: a.trnP ? String(a.trnP) : '—', hint: `${a.trnN} 场`, cls: '' },
  ]
})

const metricKey = ref(BOARD_METRICS[0].k)
const matrix = computed(() => boardMatrix(store.db, store.checkScores, metricKey.value))
const monthLabels = MONTHS.map((m) => `${m}月`)
const cmpTrend = computed(() => complaintTrend(store.db, '全部'))
const chkTrendData = computed(() => checkTrend(store.checkScores, '全部'))

function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
function fmtScore(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)} 分`
}
function faTone(v: number | null): string {
  if (v == null) return ''
  return v < 60 ? 'cell-dan' : v < 95 ? 'cell-warn' : 'cell-ok'
}
function fqcTone(v: number | null): string {
  if (v == null) return ''
  return v > 5 ? 'cell-dan' : v > 3 ? 'cell-warn' : 'cell-ok'
}
function closeTone(v: number | null): string {
  if (v == null) return ''
  return v < 80 ? 'cell-dan' : v < 95 ? 'cell-warn' : 'cell-ok'
}
function chkTone(v: number | null): string {
  if (v == null) return ''
  return v < 90 ? 'cell-dan' : v < 100 ? 'cell-warn' : 'cell-ok'
}
function perfTone(v: number | null): string {
  if (v == null) return ''
  return v < 95 ? 'cell-dan' : v < 100 ? 'cell-warn' : 'cell-ok'
}
function achTone(rate: number | null): string {
  if (rate == null) return ''
  return rate >= 1 ? 'cell-ok' : rate >= 0.6 ? 'cell-warn' : 'cell-dan'
}
</script>

<style scoped>
.board-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.board-head h2 {
  margin: 0 0 4px;
  font-size: 17px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 12px;
  margin: 0;
}
.table-wrap {
  overflow-x: auto;
}
.kpi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.kpi-table th,
.kpi-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #edf1f6;
  text-align: right;
  white-space: nowrap;
}
.kpi-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}
.kpi-table th:first-child,
.kpi-table td:first-child {
  text-align: left;
}
.kpi-table tbody tr:hover {
  background: #f7faff;
}
.row-link {
  cursor: pointer;
}
.col-ws {
  min-width: 140px;
}
.wsdot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 7px;
}
.cell-ok {
  color: #0b7a45;
  font-weight: 600;
}
.cell-warn {
  color: #b45309;
}
.cell-dan {
  color: #b91c1c;
  font-weight: 600;
}
.foot-note {
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: #7a8494;
}
.metric-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.metric-tab {
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  color: #566070;
  cursor: pointer;
}
.metric-tab.on {
  background: #3b6fe0;
  border-color: #3b6fe0;
  color: #fff;
}
.trend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 14px;
}
.trend-grid :deep(.section-card) {
  margin-bottom: 14px;
}
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid #f1d5d1;
  border-radius: 8px;
  background: #fff8f7;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.alert-item.warn {
  border-color: #f3e2c3;
  background: #fffaf1;
}
.alert-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dc2626;
}
.alert-item.warn .alert-dot {
  background: #d97706;
}
.alert-title {
  font-weight: 600;
  color: #1f2733;
}
.alert-desc {
  color: #7a8494;
  font-size: 12px;
}
.alert-go {
  margin-left: auto;
  font-size: 12px;
  color: #3b6fe0;
}
</style>
