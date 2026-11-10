<template>
  <div class="page-scroll">
    <div class="fqc-head">
      <div>
        <h2>{{ key === '全部' ? '全厂终检 FQC' : `${key} · 终检 FQC` }}</h2>
        <p class="muted small">
          {{ meta ? `${meta.frm || '—'} 至 ${meta.to || '—'} · ${bookCount} 本台账` : '暂无终检台账' }}
          <span v-if="meta && meta.file"> · {{ meta.file }}</span>
        </p>
      </div>
      <span class="muted small">一车间一本；全厂为 6 本相加，注塑与注塑毛边不合账。</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">检验批次</div>
        <div class="value">{{ mn('lots') ?? '—' }}</div>
        <div class="muted small">抽检 {{ mn('samp') ?? '—' }} pcs</div>
      </div>
      <div class="kpi-card" :class="batchRate != null && batchRate > 3 ? 'dan' : ''">
        <div class="label">NG 批</div>
        <div class="value">{{ meta ? ngCount : '—' }}</div>
        <div class="muted small">批次不良率 {{ fmtPct(batchRate, 2) }}</div>
      </div>
      <div class="kpi-card" :class="batchRate != null && batchRate > 3 ? 'dan' : ''">
        <div class="label">批次不良率</div>
        <div class="value">{{ fmtPct(batchRate, 2) }}</div>
        <div class="muted small">目标 ≤3%</div>
      </div>
      <div class="kpi-card">
        <div class="label">件不良率</div>
        <div class="value">{{ fmtPct(pieceRate, 2) }}</div>
        <div class="muted small">不良 pcs / 抽检 pcs</div>
      </div>
      <div class="kpi-card">
        <div class="label">重检合格率</div>
        <div class="value">{{ fmtPct(recheckRate) }}</div>
        <div class="muted small">
          重检 {{ mn('recheck') ?? '—' }} 批 · 合格 {{ mn('recheckOk') ?? '—' }}
        </div>
      </div>
      <div class="kpi-card" :class="highRisk.length ? 'warn' : ''">
        <div class="label">单条高不良（≥20%）</div>
        <div class="value">{{ highRisk.length || '—' }}</div>
        <div class="muted small">清查记录 {{ clearRows.length }} 条</div>
      </div>
    </div>

    <div v-if="batchRate != null && batchRate > 3" class="banner banner--dan">
      本期批次不良率 {{ fmtPct(batchRate, 2) }}，超过 3% 目标，请在车间总览置顶跟进。
    </div>
    <div v-if="highRisk.length" class="banner banner--warn">
      高不良记录 {{ highRisk.length }} 条：
      {{ highRisk.slice(0, 3).map((r) => `${r.pn || '—'} ${fmtPct(fqcRateRow(r))}`).join('、') }}
      <template v-if="highRisk.length > 3"> 等</template>
    </div>

    <SectionCard title="月度 NG 批次与批次不良率" subtitle="柱＝NG 批（左轴）· 线＝批次不良率 %（右轴）">
      <IpqcComboChart :labels="trend.labels" :bars="trend.ng" :line="trend.rate" />
    </SectionCard>

    <SectionCard title="不良项柏拉图" subtitle="按缺陷项次 · 多缺陷批重复计">
      <IpqcParetoChart v-if="pareto.length" :items="pareto" :top="14" :height="380" />
      <p v-else class="muted small">本期无不良项记录。</p>
    </SectionCard>

    <div class="grid-2">
      <SectionCard title="NG TOP 零件" subtitle="按 NG 批排序">
        <div v-if="parts.length" class="mini-table-wrap">
          <table class="mini-table">
            <thead>
              <tr>
                <th>料号</th>
                <th>NG 批</th>
                <th>检验批</th>
                <th>不良 pcs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in parts.slice(0, 12)" :key="p.pn">
                <td>{{ p.pn }}</td>
                <td class="num">{{ p.ng }}</td>
                <td class="num">{{ p.lots }}</td>
                <td class="num">{{ p.bad }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted small">本期无 NG 零件记录。</p>
      </SectionCard>

      <SectionCard title="检验员统计" subtitle="按检验批 · NG 批">
        <div v-if="inspectors.length" class="mini-table-wrap">
          <table class="mini-table">
            <thead>
              <tr>
                <th>检验员</th>
                <th>检验批</th>
                <th>NG 批</th>
                <th>NG 率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in inspectors.slice(0, 12)" :key="w.who">
                <td>{{ w.who }}</td>
                <td class="num">{{ w.lots }}</td>
                <td class="num">{{ w.ng }}</td>
                <td class="num">{{ fmtPct(w.rate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted small">本期无检验员记录。</p>
      </SectionCard>
    </div>

    <SectionCard title="终检不良明细（NG）" subtitle="可搜索、导出 · 失焦保存">
      <IpqcEditableTable
        table-id="fqc-ng"
        unit="批"
        file-base="终检不良明细"
        :rows="ngRows"
        :columns="ngColumns"
        :page-size="15"
        placeholder="搜索日期 / 料号 / 批次 / 不良 / 检验员"
        @change="persist"
        @bulk-change="persist"
      />
    </SectionCard>

    <SectionCard title="不良品清查记录" subtitle="涉及车间可多值 · 按包含匹配归属">
      <IpqcEditableTable
        table-id="fqc-clear"
        unit="条"
        file-base="终检不良清查"
        :rows="clearRows"
        :columns="clearColumns"
        :page-size="12"
        placeholder="搜索日期 / 料号 / 品名 / 不良 / 涉及车间"
        @change="persist"
        @bulk-change="persist"
      />
    </SectionCard>

    <p class="foot-note">
      批次不良率 = NG 批 / 检验批；件不良率 = 不良 pcs / 抽检 pcs。预警口径：单条清查记录不良率 ≥20%
      为「终检高不良」；批次不良率 >3% 在车间总览置顶。数据缺失显示「—」。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcComboChart from '@/components/ipqc-chart/ipqc-combo-chart.vue'
import IpqcParetoChart from '@/components/ipqc-chart/ipqc-pareto-chart.vue'
import IpqcEditableTable from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import type { EditColumn } from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import {
  aggFqc,
  deptsHas,
  fqcHighRiskRows,
  fqcInspectorStats,
  fqcKeysOf,
  fqcParetoFromRows,
  fqcPartsFromRows,
  fqcRateRow,
} from '@/domain/ipqc/fqc'
import type { FqcClearRow, FqcNgRow } from '@/domain/ipqc/types'
import { fp, num, pct, sum } from '@/domain/ipqc/format'
import { fqcTrend } from '@/domain/ipqc/trend'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const key = computed(() => store.workshop)
const keys = computed(() => fqcKeysOf(key.value))
const book = computed(() => aggFqc(keys.value))
const bookCount = computed(() => keys.value.length)

const ngList = computed(() =>
  (store.db.fqcNg as FqcNgRow[]).filter((r) =>
    keys.value.includes(String(r.ws || '注塑'))
  )
)
const ngCount = computed(() => ngList.value.length)
const badTotal = computed(() => sum(ngList.value, (r) => num(r.bad)))

const meta = computed(
  () => (book.value?.meta || null) as Record<string, unknown> | null
)
function mn(k: string): number | null {
  const v = meta.value?.[k]
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v)
}
const batchRate = computed(() => {
  const lots = mn('lots')
  return lots ? pct(ngCount.value, lots) : null
})
const pieceRate = computed(() => {
  const samp = mn('samp')
  return samp ? pct(badTotal.value, samp) : null
})
const recheckRate = computed(() => {
  const n = mn('recheck')
  const ok = mn('recheckOk')
  return n ? pct(ok || 0, n) : null
})

const trend = computed(() => fqcTrend(ngList.value, keys.value))

const pareto = computed(() => fqcParetoFromRows(ngList.value))
const parts = computed(() => {
  const lotsMap: Record<string, number> = {}
  ;(book.value?.parts || []).forEach((p) => {
    lotsMap[p.pn] = p.lots
  })
  return fqcPartsFromRows(ngList.value, lotsMap)
})

const ngRows = computed<Record<string, unknown>[]>(
  () => ngList.value as unknown as Record<string, unknown>[]
)
const inspectors = computed(() => fqcInspectorStats(ngList.value, keys.value))

const clearList = computed<FqcClearRow[]>(() => {
  const all = store.db.fqc as FqcClearRow[]
  if (key.value === '全部') return all
  return all.filter((r) => deptsHas(r, key.value))
})
const clearRows = computed(
  () => clearList.value as unknown as Record<string, unknown>[]
)
const highRisk = computed(() => fqcHighRiskRows(clearList.value))

const ngColumns: EditColumn[] = [
  { key: 'ws', label: '车间', width: 92, type: 'select', options: WORKSHOPS.map((w) => w.key) },
  { key: 'd', label: '日期', width: 100 },
  { key: 'pn', label: '料号', width: 118 },
  { key: 'lot', label: '批次', width: 80 },
  { key: 'samp', label: '抽检 pcs', width: 88, type: 'num' },
  { key: 'bad', label: '不良 pcs', width: 88, type: 'num' },
  { key: 'cat', label: '不良类别', width: 110 },
  { key: 'defs', label: '不良描述', width: 170 },
  { key: 'who', label: '检验员', width: 84 },
  { key: 'act', label: '处理', width: 140 },
  { key: 're', label: '重检', width: 80 },
  { key: 'rd', label: '判定日', width: 96 },
]

const clearColumns: EditColumn[] = [
  { key: 'date', label: '日期', width: 100 },
  { key: 'pn', label: '料号', width: 118 },
  { key: 'part', label: '品名', width: 120 },
  { key: 'issue', label: '不良问题', width: 170 },
  { key: 'checker', label: '检查人', width: 84 },
  { key: 'depts', label: '涉及车间', width: 130 },
  { key: 'stock', label: '库存', width: 76, type: 'num' },
  { key: 'ng', label: '不良数', width: 80, type: 'num' },
  {
    key: 'rate',
    label: '不良率',
    width: 84,
    format: (r) => `${fp(fqcRateRow(r), 1)}%`,
  },
  { key: 'note', label: '备注', width: 200 },
  { key: 'action', label: '对策', width: 180 },
]

function persist(): void {
  store.persist()
}
function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
</script>

<style scoped>
.fqc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.fqc-head h2 {
  margin: 0 0 4px;
  font-size: 17px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
  margin: 0;
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
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 14px;
}
.mini-table-wrap {
  overflow-x: auto;
}
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.mini-table th,
.mini-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #edf1f6;
  text-align: left;
  white-space: nowrap;
}
.mini-table th {
  color: #64748b;
  font-weight: 600;
  background: #f8fafc;
}
.mini-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.foot-note {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: #7a8494;
}
</style>
