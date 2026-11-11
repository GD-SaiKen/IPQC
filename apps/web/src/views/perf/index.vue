<template>
  <div class="page-scroll">
    <div class="perf-head">
      <h2>{{ key === '全部' ? '全厂' : key }} · 工作绩效</h2>
      <span class="muted small">
        个人月均分 = 100 + 各月净加减分平均；等级 ≥105 A、≥100 B、≥95 C、其余 D。
      </span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">参评人数</div>
        <div class="value">{{ rank.length || '—' }}</div>
        <div class="muted small">{{ detail.length }} 条加减分明细</div>
      </div>
      <div class="kpi-card">
        <div class="label">绩效平均分</div>
        <div class="value">{{ avg != null ? `${fp(avg, 1)} 分` : '—' }}</div>
        <div class="muted small">基准 100</div>
      </div>
      <div class="kpi-card">
        <div class="label">A 级人数</div>
        <div class="value">{{ grades.A || '—' }}</div>
        <div class="muted small">≥105 分</div>
      </div>
      <div class="kpi-card" :class="grades.D ? 'dan' : ''">
        <div class="label">D 级人数</div>
        <div class="value">{{ grades.D || '—' }}</div>
        <div class="muted small">&lt;95 分</div>
      </div>
      <div class="kpi-card" :class="passRate != null && passRate < 100 ? 'warn' : ''">
        <div class="label">达 B 及以上</div>
        <div class="value">{{ fmtPct(passRate) }}</div>
        <div class="muted small">≥100 分占比</div>
      </div>
    </div>

    <SectionCard title="绩效前三名">
      <div v-if="podium.length" class="podium">
        <div
          v-for="(p, i) in podium"
          :key="p.name"
          class="podium-item"
          :class="`place-${i + 1}`"
        >
          <span class="medal">{{ i + 1 }}</span>
          <div class="podium-name">{{ p.name }}</div>
          <div class="podium-score">{{ fp(p.total, 1) }} 分</div>
          <span class="grade" :class="`grade-${p.grade}`">{{ p.grade }}</span>
          <div class="podium-dept">{{ p.dept }} · {{ p.cnt }} 条</div>
        </div>
      </div>
      <p v-else class="muted small">当前车间暂无绩效明细。</p>
      <div class="grade-strip">
        <span class="grade-chip grade-A">A ≥105 · {{ grades.A || 0 }} 人</span>
        <span class="grade-chip grade-B">B ≥100 · {{ grades.B || 0 }} 人</span>
        <span class="grade-chip grade-C">C ≥95 · {{ grades.C || 0 }} 人</span>
        <span class="grade-chip grade-D">D &lt;95 · {{ grades.D || 0 }} 人</span>
      </div>
    </SectionCard>

    <div class="grid-2">
      <SectionCard title="加分构成" subtitle="按维度汇总正分">
        <IpqcHbar v-if="attrStats.add.length" :items="attrStats.add" />
        <p v-else class="muted small">暂无加分记录。</p>
      </SectionCard>
      <SectionCard title="扣分构成" subtitle="按维度汇总负分绝对值">
        <IpqcHbar v-if="attrStats.sub.length" :items="attrStats.sub" />
        <p v-else class="muted small">暂无扣分记录。</p>
      </SectionCard>
    </div>

    <SectionCard title="绩效排名" subtitle="只读 · 按月均分排序">
      <div class="table-wrap">
        <table class="rank-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>姓名</th>
              <th>车间</th>
              <th>明细</th>
              <th>月数</th>
              <th>加分均值</th>
              <th>扣分均值</th>
              <th>月均分</th>
              <th>等级</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in rank" :key="p.name">
              <td class="num">{{ i + 1 }}</td>
              <td>{{ p.name }}</td>
              <td>{{ p.dept }}</td>
              <td class="num">{{ p.cnt }}</td>
              <td class="num">{{ p.monthCount }}</td>
              <td class="num add">+{{ fp(p.add, 1) }}</td>
              <td class="num sub">-{{ fp(p.sub, 1) }}</td>
              <td class="num strong">{{ fp(p.total, 1) }}</td>
              <td>
                <span class="grade" :class="`grade-${p.grade}`">{{ p.grade }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!rank.length" class="muted small">没有符合条件的绩效记录。</p>
      </div>
      <p class="foot-note">
        多人责任按 /、、 均分（2–3 个汉字姓名）；排名表与 A/B/C/D 人数随下方明细编辑自动重算。
      </p>
    </SectionCard>

    <SectionCard title="加减分明细" subtitle="可编辑 · 失焦保存后排名重算">
      <IpqcEditableTable
        table-id="perf"
        unit="条"
        file-base="绩效加减分"
        :rows="detail"
        :columns="columns"
        :page-size="15"
        placeholder="搜索日期 / 姓名 / 维度 / 事项"
        show-add
        show-delete
        @change="persist"
        @bulk-change="persist"
        @add="addRow"
        @delete="deleteRow"
      />
    </SectionCard>

    <SectionCard title="考核方案与加减分规则" subtitle="原文可阅读 · 本期不计算工资金额">
      <div class="rules">
        <div v-for="r in PERF_RULES" :key="r.item" class="rule">
          <div class="rule-head">
            <i :style="{ background: r.color }" />
            <b>{{ r.item }}</b>
          </div>
          <ul>
            <li v-for="(line, i) in r.rows" :key="i">{{ line }}</li>
          </ul>
        </div>
      </div>
      <p class="foot-note">
        个人绩效金额 = 总绩效金额 ×（个人得分 ÷ 总得分），得分可以为负。本期只展示得分、等级与规则，
        <b>不计算、不展示绩效工资金额</b>。
      </p>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcHbar from '@/components/ipqc-chart/ipqc-hbar.vue'
import IpqcEditableTable from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import type { EditColumn } from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import { fp, shortDept } from '@/domain/ipqc/format'
import {
  computePerf,
  PERF_ATTRS,
  PERF_RULES,
  perfAttrStats,
  perfAverage,
  perfGradeCounts,
} from '@/domain/ipqc/perf'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const key = computed(() => store.workshop)
const isAll = computed(() => key.value === '全部')

const detailList = computed(() =>
  store.db.perf.filter((p) => isAll.value || shortDept(p.dept) === key.value)
)
const detail = computed(
  () => detailList.value as unknown as Record<string, unknown>[]
)
const rank = computed(() => computePerf(detailList.value))
const podium = computed(() => rank.value.slice(0, 3))
const avg = computed(() => perfAverage(rank.value))
const grades = computed(() => perfGradeCounts(rank.value))
const passRate = computed(() =>
  rank.value.length
    ? (rank.value.filter((p) => p.total >= 100).length / rank.value.length) * 100
    : null
)
const attrStats = computed(() => perfAttrStats(detailList.value))

const ATTR_OPTS = Array.from(new Set([...PERF_ATTRS, ...store.db.perf.map((p) => p.attr)]))
const DEPT_OPTS = Array.from(
  new Set([
    ...WORKSHOPS.map((w) => w.key),
    ...store.db.perf.map((p) => String(p.dept ?? '')),
  ].filter(Boolean))
)
const columns: EditColumn[] = [
  { key: 'date', label: '日期', width: 100 },
  { key: 'dept', label: '车间', width: 96, type: 'select', options: DEPT_OPTS },
  { key: 'who', label: '姓名', width: 92 },
  { key: 'attr', label: '维度', width: 104, type: 'select', options: ATTR_OPTS },
  { key: 'item', label: '事项', width: 260 },
  { key: 'score', label: '分值', width: 80, type: 'num' },
]

function persist(): void {
  store.persist()
}
function addRow(): void {
  store.db.perf.unshift({
    date: new Date().toISOString().slice(0, 10),
    dept: isAll.value ? '注塑' : key.value,
    who: '',
    attr: PERF_ATTRS[0],
    item: '',
    score: 0,
  })
  store.persist()
}
function deleteRow(row: Record<string, unknown>): void {
  const list = store.db.perf
  const i = list.indexOf(row as unknown as (typeof list)[number])
  if (i < 0) return
  list.splice(i, 1)
  store.persist()
}
function fmtPct(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)}%`
}
</script>

<style scoped>
.perf-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.perf-head h2 {
  margin: 0;
  font-size: 17px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
}
.podium {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.podium-item {
  flex: 1;
  min-width: 150px;
  padding: 12px 14px;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  background: #fbfcfe;
  text-align: center;
}
.podium-item.place-1 {
  border-color: #f2c94c;
  background: linear-gradient(180deg, #fffaf0, #fff);
}
.podium-item.place-2 {
  border-color: #cbd5e1;
}
.podium-item.place-3 {
  border-color: #e6c9a8;
}
.medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #334155;
  color: #fff;
  font-size: 12px;
}
.place-1 .medal {
  background: #d4a017;
}
.place-2 .medal {
  background: #94a3b8;
}
.place-3 .medal {
  background: #b8773e;
}
.podium-name {
  margin-top: 6px;
  font-weight: 600;
}
.podium-score {
  font-size: 18px;
  font-weight: 700;
  margin: 2px 0 4px;
}
.podium-dept {
  font-size: 11px;
  color: #7a8494;
  margin-top: 4px;
}
.grade {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
}
.grade-A {
  background: #0f9d58;
}
.grade-B {
  background: #2563eb;
}
.grade-C {
  background: #d97706;
}
.grade-D {
  background: #dc2626;
}
.grade-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.grade-chip {
  width: auto;
  height: auto;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
}
.grade-chip.grade-A {
  background: #e5f6ec;
  color: #0b7a45;
}
.grade-chip.grade-B {
  background: #eaf0ff;
  color: #1d4ed8;
}
.grade-chip.grade-C {
  background: #fdf5df;
  color: #a16207;
}
.grade-chip.grade-D {
  background: #fff1f0;
  color: #b91c1c;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 14px;
}
.table-wrap {
  overflow-x: auto;
}
.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.rank-table th,
.rank-table td {
  padding: 7px 9px;
  border-bottom: 1px solid #edf1f6;
  text-align: left;
  white-space: nowrap;
}
.rank-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}
.rank-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rank-table .add {
  color: #0b7a45;
}
.rank-table .sub {
  color: #b91c1c;
}
.rank-table .strong {
  font-weight: 700;
}
.rules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
}
.rule {
  border: 1px solid #eef2f8;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fbfcfe;
}
.rule-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}
.rule-head i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.rule ul {
  margin: 0;
  padding-left: 18px;
  font-size: 11.5px;
  line-height: 1.7;
  color: #566070;
}
.foot-note {
  margin: 12px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: #7a8494;
}
</style>
