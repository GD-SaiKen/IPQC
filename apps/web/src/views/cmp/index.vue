<template>
  <div class="page-scroll">
    <div class="cmp-head">
      <h2>{{ key === '全部' ? '全厂' : key }} · 零件投诉闭环</h2>
      <span class="muted small">
        来源部门＝谁在投诉；责任车间＝谁负责。未填实际结案日期视为未结案。
      </span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">投诉批次</div>
        <div class="value">{{ stats.total || '—' }}</div>
        <div class="muted small">未结 {{ stats.overdue }} 批</div>
      </div>
      <div class="kpi-card" :class="stats.replyRate != null && stats.replyRate < 90 ? 'warn' : ''">
        <div class="label">按时回复率</div>
        <div class="value">{{ fmtPct(stats.replyRate) }}</div>
        <div class="muted small">已回复 {{ fmtPct(stats.replyDone) }}</div>
      </div>
      <div class="kpi-card" :class="stats.dispRate != null && stats.dispRate < 90 ? 'warn' : ''">
        <div class="label">按时处理率</div>
        <div class="value">{{ fmtPct(stats.dispRate) }}</div>
        <div class="muted small">已处理 {{ fmtPct(stats.dispDone) }}</div>
      </div>
      <div class="kpi-card" :class="stats.closeRate != null && stats.closeRate < 95 ? 'warn' : ''">
        <div class="label">结案率</div>
        <div class="value">{{ fmtPct(stats.closeRate) }}</div>
        <div class="muted small">已结 {{ stats.closed }} 批</div>
      </div>
      <div class="kpi-card" :class="stats.closeOnTime != null && stats.closeOnTime < 90 ? 'warn' : ''">
        <div class="label">按时结案率</div>
        <div class="value">{{ fmtPct(stats.closeOnTime) }}</div>
        <div class="muted small">按时分母＝已填按时标记</div>
      </div>
      <div class="kpi-card" :class="stats.repeat ? 'dan' : ''">
        <div class="label">重复投诉</div>
        <div class="value">{{ stats.repeat || '—' }}</div>
        <div class="muted small">repeat＝是</div>
      </div>
    </div>

    <div v-if="stats.repeat" class="banner banner--warn">
      重复投诉 {{ stats.repeat }} 批，建议按零件 / 原因立项改善。
    </div>
    <div v-if="stats.overdue" class="banner banner--dan">
      未结案 {{ stats.overdue }} 批：{{ openTop }}。填上实际结案日期后将从总览异常区消失。
    </div>

    <SectionCard title="投诉闭环 5 步" subtitle="受理 → 临时对策 → 原因 → 永久对策 → 结案验证">
      <div class="flow">
        <div v-for="(f, i) in FLOW" :key="f" class="flow-step">
          <span class="flow-n">{{ i + 1 }}</span>
          <b>{{ f }}</b>
          <span v-if="i < FLOW.length - 1" class="flow-arrow">→</span>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="投诉月度走势" subtitle="按责任车间 · 1–10 月">
      <IpqcLineChart :labels="monthLabels" :series="trend" :height="240" />
    </SectionCard>

    <div class="grid-2">
      <SectionCard title="根本原因分布" subtitle="原因文本归类">
        <IpqcHbar v-if="causes.length" :items="causes" color="#7c3aed" />
        <p v-else class="muted small">暂无原因数据。</p>
      </SectionCard>
      <SectionCard title="投诉来源部门" subtitle="谁在投诉 · BC / LP 归并">
        <IpqcDonut v-if="sources.length" :items="sources" unit="投诉批" />
        <p v-else class="muted small">暂无来源数据。</p>
      </SectionCard>
    </div>

    <SectionCard title="责任人负荷" subtitle="件数 · 未结案">
      <IpqcHbar v-if="owners.length" :items="owners" color="#0d9488" />
      <p v-else class="muted small">暂无责任人数据。</p>
    </SectionCard>

    <SectionCard title="投诉台账（完整闭环字段）" subtitle="可搜索、导出 · 失焦保存">
      <IpqcEditableTable
        table-id="cmp"
        unit="批"
        file-base="零件投诉闭环"
        :rows="rows"
        :columns="columns"
        :page-size="12"
        placeholder="搜索日期 / 来源 / 零件 / 料号 / 问题 / 责任人"
        show-add
        show-delete
        @change="persist"
        @bulk-change="persist"
        @add="addRow"
        @delete="deleteRow"
      />
      <p class="foot-note">
        按时「是 / 否」未填视为未回复，不计入按时分母。重复投诉（repeat＝是）单独提示；
        未填实际结案日期视为未结案，填上后结案率即时更新。
      </p>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcLineChart from '@/components/ipqc-chart/ipqc-line-chart.vue'
import IpqcHbar from '@/components/ipqc-chart/ipqc-hbar.vue'
import IpqcDonut from '@/components/ipqc-chart/ipqc-donut.vue'
import IpqcEditableTable from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import type { EditColumn } from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import {
  cmpCauseDistribution,
  cmpOwnerLoad,
  cmpSourceDistribution,
  cmpStats,
} from '@/domain/ipqc/cmp'
import { fp, shortDept } from '@/domain/ipqc/format'
import { complaintTrend } from '@/domain/ipqc/trend'
import { MONTHS, WORKSHOPS } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const key = computed(() => store.workshop)
const isAll = computed(() => key.value === '全部')
const list = computed(() =>
  store.db.cmp.filter((c) => isAll.value || shortDept(c.dept) === key.value)
)
const stats = computed(() => cmpStats(list.value))
const rows = computed<Record<string, unknown>[]>(
  () => list.value as unknown as Record<string, unknown>[]
)

const openTop = computed(() =>
  list.value
    .filter((c) => !c.actClose)
    .slice(0, 4)
    .map((c) => `${c.part || c.pn || '—'}（${c.owner || '未指派'}）`)
    .join('、')
)

const FLOW = ['受理登记', '临时对策', '原因分析', '永久对策', '结案验证']
const monthLabels = MONTHS.map((m) => `${m}月`)
const trend = computed(() => complaintTrend(store.db, key.value))

const CAUSE_COLORS = ['#7c3aed', '#2563eb', '#0d9488', '#d97706', '#dc2626', '#db2777', '#64748b', '#0f9d58', '#94a3b8']
const causes = computed(() =>
  cmpCauseDistribution(list.value).map((b, i) => ({
    label: b.label,
    value: b.value,
    text: `${b.value} 批`,
    color: CAUSE_COLORS[i % CAUSE_COLORS.length],
  }))
)

const SOURCE_COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#7c3aed', '#dc2626', '#db2777', '#64748b', '#0891b2']
const sources = computed(() =>
  cmpSourceDistribution(list.value).map((b, i) => ({
    label: b.label,
    value: b.value,
    color: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }))
)

const owners = computed(() =>
  cmpOwnerLoad(list.value).map((o) => ({
    label: o.label,
    value: o.value,
    text: `${o.value} 批 · 未结 ${o.open}`,
    title: `${o.label}：${o.value} 批，未结 ${o.open} 批`,
  }))
)

const YN = ['是', '否', '']
const SOURCE_OPTS = Array.from(
  new Set(store.db.cmp.map((c) => String(c.from ?? '')).filter(Boolean))
)
const CMP_DEPT_OPTS = Array.from(
  new Set([
    ...WORKSHOPS.map((w) => w.key),
    ...store.db.cmp.map((c) => String(c.dept ?? '')).filter(Boolean),
  ])
)
const columns: EditColumn[] = [
  { key: 'date', label: '日期', width: 100 },
  { key: 'from', label: '投诉来源', width: 106, type: 'select', options: SOURCE_OPTS },
  { key: 'dept', label: '责任车间', width: 96, type: 'select', options: CMP_DEPT_OPTS },
  { key: 'model', label: '机型', width: 90 },
  { key: 'part', label: '零件', width: 110 },
  { key: 'pn', label: '料号', width: 116 },
  { key: 'issue', label: '问题', width: 180 },
  { key: 'cause', label: '原因', width: 180 },
  { key: 'temp', label: '临时对策', width: 170 },
  { key: 'perm', label: '永久对策', width: 170 },
  { key: 'owner', label: '责任人', width: 84 },
  { key: 'planReply', label: '计划回复', width: 96 },
  { key: 'actReply', label: '实际回复', width: 96 },
  { key: 'ontimeReply', label: '按时回复', width: 88, type: 'select', options: YN },
  { key: 'planDisp', label: '计划处理', width: 96 },
  { key: 'actDisp', label: '实际处理', width: 96 },
  { key: 'ontimeDisp', label: '按时处理', width: 88, type: 'select', options: YN },
  { key: 'planClose', label: '计划结案', width: 96 },
  { key: 'actClose', label: '实际结案', width: 96 },
  { key: 'ontimeClose', label: '按时结案', width: 88, type: 'select', options: YN },
  { key: 'repeat', label: '重复投诉', width: 88, type: 'select', options: ['是', '否'] },
]

function persist(): void {
  store.persist()
}
function addRow(): void {
  store.db.cmp.unshift({
    date: new Date().toISOString().slice(0, 10),
    from: '',
    dept: key.value === '全部' ? '注塑' : key.value,
    model: '',
    part: '',
    pn: '',
    issue: '',
    cause: '',
    temp: '',
    perm: '',
    owner: '',
    planReply: '',
    actReply: '',
    ontimeReply: '',
    planDisp: '',
    actDisp: '',
    ontimeDisp: '',
    planClose: '',
    actClose: '',
    ontimeClose: '',
    repeat: '否',
  })
  store.persist()
}
function deleteRow(row: Record<string, unknown>): void {
  const list = store.db.cmp
  const i = list.indexOf(row as unknown as (typeof list)[number])
  if (i < 0) return
  list.splice(i, 1)
  store.persist()
}
function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
</script>

<style scoped>
.cmp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.cmp-head h2 {
  margin: 0;
  font-size: 17px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
}
.banner {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 12px;
}
.banner--dan {
  background: #fff1f0;
  border: 1px solid #f1d5d1;
  color: #b91c1c;
}
.banner--warn {
  background: #fffaf1;
  border: 1px solid #f3e2c3;
  color: #b45309;
}
.flow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.flow-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eef4ff;
  color: #1d4ed8;
  font-size: 12.5px;
}
.flow-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
}
.flow-arrow {
  margin-left: 6px;
  color: #93a4bc;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 14px;
}
.foot-note {
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: #7a8494;
}
</style>
