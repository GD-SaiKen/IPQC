<template>
  <div class="page-scroll">
    <div v-if="ws" class="ws-banner" :style="{ borderLeftColor: ws.color }">
      <i class="wsdot" :style="{ background: ws.color }" />
      <b>{{ ws.name }} · 子工作台</b>
      <span class="muted">负责人 {{ ws.owner }} · CE {{ ws.ce }}</span>
      <span class="muted small">数据周期 2026 年 1–10 月</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" :class="fa.faOK != null && fa.faOK < 95 ? 'warn' : ''">
        <div class="label">首件一次合格率</div>
        <div class="value">{{ fmtPct(fa.faOK) }}</div>
        <div class="muted small">{{ fa.total }} 批 · NG {{ fa.ng }} 批</div>
      </div>
      <div class="kpi-card" :class="fa.fbRate < 90 ? 'dan' : ''">
        <div class="label">NG 5 分钟反馈率</div>
        <div class="value">{{ fa.ng ? fmtPct(fa.fbRate) : '—' }}</div>
        <div class="muted small">已填反馈 · 均 {{ fa.avgFb ? `${fp(fa.avgFb, 1)} 分钟` : '—' }}</div>
      </div>
      <div class="kpi-card" :class="fa.ivRate < 85 ? 'dan' : ''">
        <div class="label">15 分钟介入率</div>
        <div class="value">{{ fa.ng ? fmtPct(fa.ivRate) : '—' }}</div>
        <div class="muted small">均 {{ fa.avgIv ? `${fp(fa.avgIv, 1)} 分钟` : '—' }}</div>
      </div>
      <div class="kpi-card" :class="cmp.closeRate < 95 ? 'warn' : ''">
        <div class="label">投诉结案率</div>
        <div class="value">{{ fmtPct(cmp.closeRate) }}</div>
        <div class="muted small">{{ cmp.total }} 批 · 未结 {{ cmp.overdue }} 批</div>
      </div>
      <div class="kpi-card" :class="chkScore != null && chkScore < 100 ? 'warn' : ''">
        <div class="label">点检（最近一次）</div>
        <div class="value">{{ fmtScore(chkScore) }}</div>
        <div class="muted small">{{ chkScale }}</div>
      </div>
      <div class="kpi-card" :class="kpiRow.fqcRate != null && kpiRow.fqcRate > 3 ? 'dan' : ''">
        <div class="label">终检批次不良率</div>
        <div class="value">{{ fmtPct(kpiRow.fqcRate, 2) }}</div>
        <div class="muted small">目标 ≤3% · {{ kpiRow.fqcLots }} 批</div>
      </div>
    </div>

    <SectionCard v-if="alerts.length" title="预警与关注" subtitle="点击跳转对应闭环页面">
      <div class="alert-list">
        <button
          v-for="(a, i) in alerts"
          :key="i"
          type="button"
          class="alert-item"
          :class="a.lv"
          @click="go(a.view)"
        >
          <i class="alert-dot" />
          <span class="alert-title">{{ a.t }}</span>
          <span class="alert-desc">{{ a.d }}</span>
          <span class="alert-go">去处理 →</span>
        </button>
      </div>
    </SectionCard>

    <SectionCard title="首件 NG 闭环（5 步）" subtitle="无对策不得生产">
      <div class="steps">
        <div v-for="s in FA_STEPS" :key="s.n" class="step" :class="`step--${s.tone}`">
          <div class="step-head">
            <span class="step-n">{{ s.n }}</span>
            <b>{{ s.title }}</b>
            <span class="step-limit">{{ s.limit }}</span>
          </div>
          <p>{{ s.desc }}</p>
          <span class="step-owner">{{ s.owner }}</span>
        </div>
      </div>
    </SectionCard>

    <div class="grid-2">
      <SectionCard title="终检不良 TOP" subtitle="按缺陷类别 · 现行明细">
        <IpqcHbar v-if="fqcTop.length" :items="fqcTop" color="#dc2626" />
        <p v-else class="muted small">本期无终检 NG 记录。</p>
      </SectionCard>
      <SectionCard title="绩效 TOP7" subtitle="基准 100 · 加减分后">
        <IpqcHbar v-if="perfTop.length" :items="perfTop" color="#2563eb" />
        <p v-else class="muted small">本期无绩效明细。</p>
      </SectionCard>
    </div>

    <SectionCard title="闭环入口">
      <el-space wrap>
        <el-button type="primary" @click="go('fa')">首件巡检 →</el-button>
        <el-button @click="go('fqc')">终检 FQC →</el-button>
        <el-button @click="go('cmp')">投诉闭环 →</el-button>
        <el-button @click="go('chk')">点检排名 →</el-button>
        <el-button @click="go('trn')">培训与技能 →</el-button>
        <el-button @click="go('perf')">工作绩效 →</el-button>
      </el-space>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcHbar from '@/components/ipqc-chart/ipqc-hbar.vue'
import { useWorkshopRoute } from '@/composables/use-workshop-route'
import { chkLatest, chkScaleText } from '@/domain/ipqc/check'
import { cmpStats } from '@/domain/ipqc/cmp'
import { faStats, FA_STEPS } from '@/domain/ipqc/fa-rules'
import { fqcCat, fqcHighRiskRows, fqcKeysOf } from '@/domain/ipqc/fqc'
import { fp, pct, shortDept } from '@/domain/ipqc/format'
import { allKpi, wsKpi } from '@/domain/ipqc/kpi'
import { computePerf } from '@/domain/ipqc/perf'
import { WS_MAP } from '@/domain/ipqc/workshops'
import type { FqcNgRow, WorkshopFilter } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const router = useRouter()
useWorkshopRoute()

const key = computed(() => store.workshop as WorkshopFilter)
const ws = computed(() => WS_MAP[key.value])
const isAll = computed(() => key.value === '全部')
const inWs = (dept: unknown) => isAll.value || shortDept(dept) === key.value

const faList = computed(() => store.db.fa.filter((r) => inWs(r.dept)))
const fa = computed(() => {
  const s = faStats(faList.value)
  return {
    ...s,
    faOK: faList.value.length ? 100 - s.ngRate : null,
  }
})

const cmpList = computed(() => store.db.cmp.filter((c) => inWs(c.dept)))
const cmp = computed(() => cmpStats(cmpList.value))

const kpiRow = computed(() =>
  isAll.value
    ? allKpi(store.db, store.checkScores, 0)
    : wsKpi(store.db, store.checkScores, key.value as Exclude<WorkshopFilter, '全部'>, 0)
)
const chkScore = computed(() =>
  isAll.value ? null : chkLatest(store.checkScores, key.value)
)
const chkScale = computed(() =>
  isAll.value ? '切换车间查看最近一次实测分' : chkScaleText(key.value)
)

const fqcRows = computed(() => {
  const keys = fqcKeysOf(key.value)
  return (store.db.fqcNg as FqcNgRow[]).filter((r) => keys.includes(String(r.ws || '')))
})

const fqcTop = computed(() => {
  const map: Record<string, number> = {}
  fqcRows.value.forEach((r) => {
    const c = fqcCat(r.defs || r.cat)
    map[c] = (map[c] || 0) + 1
  })
  return Object.keys(map)
    .map((label) => ({ label, value: map[label], text: `${map[label]} 项` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
})

const perfTop = computed(() => {
  const list = computePerf(store.db.perf.filter((p) => inWs(p.dept)))
  return list.slice(0, 7).map((p) => ({
    label: p.name,
    value: p.total,
    text: `${p.total} · ${p.grade}`,
    title: `${p.name} · ${p.dept} · ${p.total} 分（${p.grade}）`,
  }))
})

interface AlertRow {
  lv: 'warn' | 'dan'
  t: string
  d: string
  view: string
}

const alerts = computed<AlertRow[]>(() => {
  const out: AlertRow[] = []
  if (kpiRow.value.fqcRate != null && kpiRow.value.fqcRate > 3) {
    out.push({
      lv: 'dan',
      t: '终检批次不良率超 3%',
      d: `${fmtPct(kpiRow.value.fqcRate, 2)} · ${kpiRow.value.fqcNg}/${kpiRow.value.fqcLots} 批`,
      view: 'fqc',
    })
  }
  const high = fqcHighRiskRows(fqcRows.value)
  if (high.length) {
    const top = high.slice(0, 2).map((r) => `${r.pn || '—'} ${fp(pct(Number(r.bad), Number(r.samp)), 1)}%`)
    out.push({
      lv: 'dan',
      t: '终检单条高不良（≥20%）',
      d: `${high.length} 条 · ${top.join('、')}`,
      view: 'fqc',
    })
  }
  const open = cmpList.value.filter((c) => !c.actClose)
  if (open.length) {
    out.push({
      lv: open.length > 3 ? 'dan' : 'warn',
      t: '投诉未结案',
      d: `${open.length} 批待结 · ${open.slice(0, 3).map((c) => c.part || c.pn || '—').join('、')}`,
      view: 'cmp',
    })
  }
  const rep = cmpList.value.filter((c) => c.repeat === '是')
  if (rep.length) {
    out.push({
      lv: 'warn',
      t: '重复投诉',
      d: `${rep.length} 批 · 建议立项改善`,
      view: 'cmp',
    })
  }
  const ngOpen = faList.value.filter(
    (r) => String(r.result).toUpperCase() === 'NG' && r.status !== '已关闭'
  )
  if (ngOpen.length) {
    out.push({
      lv: 'warn',
      t: '首件 NG 未关闭',
      d: `${ngOpen.length} 条 · 需复检确认 / 结案`,
      view: 'fa',
    })
  }
  return out
})

function go(view: string): void {
  void router.push({ name: view, query: isAll.value ? undefined : { ws: key.value } })
}
function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
function fmtScore(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)} 分`
}
</script>

<style scoped>
.wsdot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.muted {
  color: #64748b;
  font-size: 12px;
}
.small {
  font-size: 11px;
  margin-top: 3px;
}
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.step {
  position: relative;
  padding: 10px 12px 10px 14px;
  border: 1px solid #e3e8f0;
  border-left: 3px solid #94a3b8;
  border-radius: 8px;
  background: #fbfcfe;
}
.step--dan {
  border-left-color: #dc2626;
}
.step--warn {
  border-left-color: #d97706;
}
.step-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.step-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #334155;
  color: #fff;
  font-size: 11px;
}
.step--dan .step-n {
  background: #dc2626;
}
.step--warn .step-n {
  background: #d97706;
}
.step-head b {
  font-size: 12.5px;
}
.step-limit {
  margin-left: auto;
  font-size: 11px;
  color: #64748b;
}
.step p {
  margin: 6px 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: #566070;
}
.step-owner {
  font-size: 11px;
  color: #7a8494;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 14px;
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
