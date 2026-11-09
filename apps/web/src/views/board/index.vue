<template>
  <div>
    <div class="page-card">
      <p class="muted">2026 年 1–10 月 · 六项指标按月汇总。点车间行进入子工作台。</p>
      <el-radio-group v-model="month" size="small" @change="onMonth">
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

    <div class="page-card">
      <h3>车间 KPI 对比</h3>
      <el-table :data="rows" stripe size="small" @row-click="onRow">
        <el-table-column prop="name" label="车间" width="120" />
        <el-table-column label="首件合格率">
          <template #default="{ row }">{{ fmtPct(row.k.faOK) }}</template>
        </el-table-column>
        <el-table-column label="终检不良率">
          <template #default="{ row }">{{ fmtPct(row.k.fqcRate, 2) }}</template>
        </el-table-column>
        <el-table-column prop="k.cmpN" label="投诉批" width="80" />
        <el-table-column label="结案率">
          <template #default="{ row }">{{ fmtPct(row.k.cmpClose) }}</template>
        </el-table-column>
        <el-table-column label="点检得分">
          <template #default="{ row }">{{ fmtScore(row.k.chk) }}</template>
        </el-table-column>
        <el-table-column label="绩效均分">
          <template #default="{ row }">{{ fmtScore(row.k.perf) }}</template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="alerts.length" class="page-card">
      <h3>异常关注</h3>
      <el-alert
        v-for="(a, i) in alerts"
        :key="i"
        :title="a.t"
        :description="a.d"
        :type="a.lv === 'dan' ? 'error' : 'warning'"
        show-icon
        style="margin-bottom: 8px"
        @click="a.ws && enterWorkshop(a.ws)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkshopRoute } from '@/composables/use-workshop-route'
import { fp } from '@/domain/ipqc/format'
import { allKpi, boardAlerts, wsKpi } from '@/domain/ipqc/kpi'
import { MONTHS, mLabel, WORKSHOPS } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'
import type { WorkshopKey } from '@/domain/ipqc/types'

const store = useIpqcStore()
const { enterWorkshop } = useWorkshopRoute()

const month = computed({
  get: () => store.boardMonth,
  set: (v: number) => store.setBoardMonth(v),
})

function onMonth() {
  /* v-model 已写入 store */
}

const summary = computed(() => allKpi(store.db, store.checkScores, store.boardMonth))
const alerts = computed(() => boardAlerts(store.db, store.checkScores, store.boardMonth))

const rows = computed(() =>
  WORKSHOPS.map((w) => ({
    key: w.key,
    name: w.name,
    k: wsKpi(store.db, store.checkScores, w.key, store.boardMonth),
  }))
)

const headline = computed(() => {
  const a = summary.value
  return [
    { label: '首件合格率', value: fmtPct(a.faOK), hint: `${a.faN} 批`, cls: '' },
    { label: '终检批次不良率', value: fmtPct(a.fqcRate, 2), hint: `目标 ≤3%`, cls: a.fqcRate != null && a.fqcRate > 3 ? 'dan' : '' },
    { label: '投诉结案率', value: fmtPct(a.cmpClose), hint: `未结 ${a.cmpOpen} 批`, cls: a.cmpOpen ? 'warn' : '' },
    {
      label: '点检均值',
      value: fmtScore(a.chkAvg),
      hint: `剔除毛边 ${fmtScore(a.chkAvgEx)} · ${mLabel(store.boardMonth)}`,
      cls: '',
    },
    { label: '绩效均分', value: fmtScore(a.perf), hint: `${a.perfN} 人`, cls: '' },
    { label: '培训人次', value: a.trnP ? String(a.trnP) : '—', hint: `${a.trnN} 场`, cls: '' },
  ]
})

function fmtPct(v: number | null | undefined, d = 1) {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
function fmtScore(v: number | null | undefined) {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)} 分`
}

function onRow(row: { key: WorkshopKey }) {
  enterWorkshop(row.key)
}
</script>

<style scoped>
.muted {
  color: #64748b;
  font-size: 13px;
}
.small {
  font-size: 11px;
  margin-top: 4px;
}
h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
</style>
