<template>
  <div>
    <div v-if="ws" class="ws-banner" :style="{ borderLeftColor: ws.color }">
      <i class="wsdot" :style="{ background: ws.color }" />
      <b>{{ ws.name }} · 子工作台</b>
      <span class="muted">负责人 {{ ws.owner }} · CE {{ ws.ce }}</span>
      <el-button size="small" style="margin-left: auto" @click="backToBoard">← 总看板</el-button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">首件一次合格率</div>
        <div class="value">{{ fmtPct(faOk) }}</div>
        <div class="muted small">{{ fa.total }} 批 · NG {{ fa.ng }}</div>
      </div>
      <div class="kpi-card" :class="fa.fbRate < 90 ? 'dan' : ''">
        <div class="label">NG 5 分钟反馈率</div>
        <div class="value">{{ fmtPct(fa.fbRate) }}</div>
      </div>
      <div class="kpi-card" :class="fa.ivRate < 85 ? 'dan' : ''">
        <div class="label">15 分钟介入率</div>
        <div class="value">{{ fmtPct(fa.ivRate) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">投诉结案率</div>
        <div class="value">{{ fmtPct(cmpClose) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">点检（最近一次）</div>
        <div class="value">{{ fmtScore(chkScore) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">终检批次不良率</div>
        <div class="value">{{ fmtPct(kpiRow.fqcRate, 2) }}</div>
      </div>
    </div>

    <div v-if="alerts.length" class="page-card">
      <h3>预警与关注</h3>
      <el-alert
        v-for="(a, i) in alerts"
        :key="i"
        :title="a.t"
        :description="a.d"
        type="warning"
        show-icon
        style="margin-bottom: 8px"
      />
    </div>

    <el-button-group>
      <el-button type="primary" @click="$router.push({ name: 'fa', query: { ws: workshopKey } })">
        首件巡检
      </el-button>
      <el-button @click="$router.push({ name: 'fqc', query: { ws: workshopKey } })">终检 FQC</el-button>
      <el-button @click="$router.push({ name: 'cmp', query: { ws: workshopKey } })">投诉闭环</el-button>
    </el-button-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkshopRoute } from '@/composables/use-workshop-route'
import { chkLatest } from '@/domain/ipqc/check'
import { fp, pct, shortDept } from '@/domain/ipqc/format'
import { faStats, wsKpi } from '@/domain/ipqc/kpi'
import { WS_MAP } from '@/domain/ipqc/workshops'
import type { WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const { backToBoard } = useWorkshopRoute()

const workshopKey = computed(() => store.workshop as WorkshopKey)
const ws = computed(() => WS_MAP[workshopKey.value])

const faList = computed(() =>
  store.db.fa.filter((r) => shortDept(r.dept) === workshopKey.value)
)
const fa = computed(() => faStats(faList.value))
const faOk = computed(() => (fa.value.total ? 100 - fa.value.ngRate : null))

const kpiRow = computed(() => wsKpi(store.db, store.checkScores, workshopKey.value, 0))

const cmpList = computed(() =>
  store.db.cmp.filter((c) => shortDept(c.dept) === workshopKey.value)
)
const cmpClose = computed(() => {
  const closed = cmpList.value.filter((c) => c.actClose).length
  return cmpList.value.length ? pct(closed, cmpList.value.length) : null
})

const chkScore = computed(() => chkLatest(store.checkScores, workshopKey.value))

const alerts = computed(() => {
  const out: { t: string; d: string }[] = []
  cmpList.value
    .filter((x) => !x.actClose)
    .slice(0, 3)
    .forEach((x) => out.push({ t: '投诉未结案', d: `${x.part || '—'} · ${x.owner || ''}` }))
  faList.value
    .filter((r) => String(r.result).toUpperCase() === 'NG' && r.status !== '已关闭')
    .slice(0, 2)
    .forEach((r) => out.push({ t: '首件 NG 未关闭', d: `${r.pn} ${r.item}` }))
  return out
})

function fmtPct(v: number | null | undefined, d = 1) {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
function fmtScore(v: number | null | undefined) {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)} 分`
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
