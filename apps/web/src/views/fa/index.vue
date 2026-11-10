<template>
  <div class="page-scroll">
    <div class="fa-layout">
      <aside class="std-panel">
        <div class="std-head">
          <h3>标准与图纸索引</h3>
          <span class="muted small">共 {{ filtered.length }} 项</span>
        </div>
        <div class="std-filters no-print">
          <input v-model="stdQ" class="std-search" placeholder="搜索标准名 / 路径 / 分类" />
          <div class="std-selects">
            <el-select v-model="stdT" size="small" style="width: 104px">
              <el-option v-for="[label, val] in STD_TYPES" :key="label" :label="label" :value="val" />
            </el-select>
            <el-select v-model="stdC" size="small" style="width: 130px">
              <el-option label="全部分类" value="" />
              <el-option v-for="c in cats" :key="c.c" :label="`${c.c}（${c.n}）`" :value="c.c" />
            </el-select>
          </div>
        </div>
        <div class="std-list">
          <div v-for="it in filtered" :key="`${it.p}-${it.n}`" class="std-item">
            <span
              class="std-type"
              :style="{
                color: stdTypeColor(it.t).color,
                background: stdTypeColor(it.t).bg,
              }"
            >{{ stdTypeColor(it.t).label }}</span>
            <div class="std-main">
              <div class="std-name" :title="it.n">{{ it.n }}</div>
              <div class="std-path" :title="stdPath(it)">{{ it.c }} · {{ stdPath(it) }}</div>
            </div>
            <div class="std-actions no-print">
              <button type="button" @click="openStd(it)">{{ stdPreviewable(it) ? '预览' : '打开' }}</button>
              <button type="button" @click="copyPath(it)">复制</button>
            </div>
          </div>
          <p v-if="!filtered.length" class="std-empty">没有匹配的标准文件。</p>
        </div>
        <p class="std-note">
          索引根目录 {{ STD_ROOT }}。浏览器不能直接打开 Excel / Word / CAD，点击「打开」会复制本机路径；
          图片可按浏览器能力预览。
        </p>
      </aside>

      <div class="fa-main">
        <el-alert
          v-if="key === '注塑毛边'"
          title="首件源表未覆盖该责任区"
          type="info"
          description="合格率显示为 —，不表示 0% 全数 NG。"
          show-icon
          :closable="false"
          style="margin-bottom: 12px"
        />

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="label">首件 / 巡检批次</div>
            <div class="value">{{ faAll.total || '—' }}</div>
            <div class="muted small">按日期 + 检验员归并</div>
          </div>
          <div class="kpi-card">
            <div class="label">NG 批</div>
            <div class="value">{{ faAll.ng || '—' }}</div>
            <div class="muted small">未关闭 {{ faAll.open }} 批</div>
          </div>
          <div class="kpi-card" :class="faAll.total && 100 - faAll.ngRate < 95 ? 'warn' : ''">
            <div class="label">首件合格率</div>
            <div class="value">{{ fmtPct(faAll.total ? 100 - faAll.ngRate : null) }}</div>
            <div class="muted small">100% − NG 批 / 总批</div>
          </div>
          <div class="kpi-card" :class="faAll.fbRate < 90 ? 'dan' : ''">
            <div class="label">≤5 分钟反馈率</div>
            <div class="value">{{ faAll.ng ? fmtPct(faAll.fbRate) : '—' }}</div>
            <div class="muted small">已填反馈均 {{ faAll.avgFb ? `${fp(faAll.avgFb, 1)} 分钟` : '—' }}</div>
          </div>
          <div class="kpi-card" :class="faAll.ivRate < 85 ? 'dan' : ''">
            <div class="label">≤15 分钟介入率</div>
            <div class="value">{{ faAll.ng ? fmtPct(faAll.ivRate) : '—' }}</div>
            <div class="muted small">已填介入均 {{ faAll.avgIv ? `${fp(faAll.avgIv, 1)} 分钟` : '—' }}</div>
          </div>
          <div class="kpi-card">
            <div class="label">NG 未关闭</div>
            <div class="value">{{ faAll.open || '—' }}</div>
            <div class="muted small">复检确认后结案</div>
          </div>
        </div>

        <SectionCard title="NG 闭环 5 步" subtitle="判定 → 反馈 → 介入 → 对策 → 复检">
          <div class="steps">
            <div v-for="s in FA_STEPS" :key="s.n" class="step" :class="`step--${s.tone}`">
              <div class="step-head">
                <span class="step-n">{{ s.n }}</span>
                <b>{{ s.title }}</b>
              </div>
              <p>{{ s.desc }}</p>
              <span class="step-meta">{{ s.owner }} · {{ s.limit }}</span>
            </div>
          </div>
        </SectionCard>

        <div class="grid-2">
          <SectionCard title="各车间首件 NG 率" subtitle="首件源表覆盖 5 个车间">
            <IpqcBarChart
              :labels="ngRateLabels"
              :series="ngRateSeries"
              :height="220"
              :max="40"
            />
          </SectionCard>
          <SectionCard title="NG 反馈时长分布" subtitle="已填反馈分钟的 NG 批">
            <IpqcHbar v-if="fbItems.length" :items="fbItems" />
            <p v-else class="muted small">本期无 NG 反馈记录。</p>
          </SectionCard>
        </div>

        <SectionCard title="重点零件 100394-003 追踪" subtitle="阻尼盘牙 · 按日归并">
          <div v-if="focus.n" class="focus">
            <div class="focus-kpis">
              <div class="focus-kpi">
                <span>批次</span><b>{{ focus.n }}</b>
              </div>
              <div class="focus-kpi">
                <span>NG 批</span><b>{{ focus.ng }}</b>
              </div>
              <div class="focus-kpi">
                <span>合格率</span><b>{{ fmtPct(100 - pct(focus.ng, focus.n)) }}</b>
              </div>
            </div>
            <div class="focus-cols">
              <div>
                <div class="focus-label">按月</div>
                <div class="focus-months">
                  <span v-for="(v, m) in focus.byMonth" :key="m">
                    {{ m.slice(5) }} 月
                    <b>{{ v.ng }}/{{ v.n }}</b>
                  </span>
                </div>
              </div>
              <div>
                <div class="focus-label">按检验员</div>
                <div class="focus-months">
                  <span v-for="(v, w) in focus.byWho" :key="w">
                    {{ w }}
                    <b>{{ v.ng }}/{{ v.n }}</b>
                  </span>
                </div>
              </div>
            </div>
            <p class="focus-note">
              源表逐尺寸实测行按「日期 + 检验员」归并为批次；批次内任一尺寸 NG 即批次 NG。
            </p>
          </div>
          <p v-else class="muted small">当前筛选下该零件无首件 / 巡检记录。</p>
        </SectionCard>

        <SectionCard title="首件 / 巡检记录" subtitle="全部字段可编辑 · 失焦保存">
          <div class="stage-tabs no-print">
            <el-radio-group v-model="stage" size="small">
              <el-radio-button value="全部">全部（{{ faAll.total }}）</el-radio-button>
              <el-radio-button v-for="s in FA_STAGES" :key="s" :value="s">
                {{ s }}（{{ stageCount(s) }}）
              </el-radio-button>
            </el-radio-group>
            <span class="muted small">判定 NG 时「NG 确认」按阶段显示责任角色，OK 显示「—」。</span>
          </div>
          <IpqcEditableTable
            table-id="fa"
            unit="条"
            file-base="首件巡检"
            :rows="faRows"
            :columns="columns"
            :page-size="15"
            placeholder="搜索日期 / 料号 / 品名 / 检验项 / 检验员"
            @change="persist"
        @bulk-change="persist"
          />
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcEditableTable from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import type { EditColumn } from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import IpqcBarChart from '@/components/ipqc-chart/ipqc-bar-chart.vue'
import IpqcHbar from '@/components/ipqc-chart/ipqc-hbar.vue'
import {
  faFeedbackBuckets,
  faFocus,
  faNgConfirmLabel,
  faNgRateByWorkshop,
  faStats,
  FA_STAGES,
  FA_STEPS,
} from '@/domain/ipqc/fa-rules'
import { fp, pct, shortDept } from '@/domain/ipqc/format'
import {
  STD_ROOT,
  STD_TYPES,
  STD_TYPE_META,
  stdCats,
  stdFiltered,
  stdPath,
  stdPreviewable,
  stdUrl,
} from '@/domain/ipqc/standards'
import type { StdItem } from '@/domain/ipqc/standards'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import type { WorkshopFilter } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const key = computed(() => store.workshop as WorkshopFilter)
const isAll = computed(() => key.value === '全部')
const inWs = (dept: unknown) => isAll.value || shortDept(dept) === key.value

const faAllList = computed(() => store.db.fa.filter((r) => inWs(r.dept)))
const faAll = computed(() => faStats(faAllList.value))

const stage = ref('全部')
const faRows = computed(() =>
  stage.value === '全部'
    ? faAllList.value
    : faAllList.value.filter((r) => r.stage === stage.value)
)
function stageCount(s: string): number {
  return faAllList.value.filter((r) => r.stage === s).length
}

const focus = computed(() => faFocus(faAllList.value))

const fbItems = computed(() =>
  faFeedbackBuckets(faAllList.value).map((b) => ({
    label: b.label,
    value: b.count,
    text: `${b.count} 批`,
    color: b.color,
  }))
)

const ngRateLabels = computed(() => WORKSHOPS.map((w) => w.name.replace('车间', '')))
const ngRateSeries = computed(() => {
  const map = faNgRateByWorkshop(store.db.fa)
  return [
    {
      name: '首件 NG 率',
      color: '#dc2626',
      data: WORKSHOPS.map((w) => {
        const s = map[w.key]
        return s && s.total ? +s.ngRate.toFixed(2) : null
      }),
    },
  ]
})

const columns: EditColumn[] = [
  { key: 'date', label: '日期', width: 100 },
  { key: 'stage', label: '阶段', width: 138, type: 'select', options: [...FA_STAGES] },
  { key: 'dept', label: '车间', width: 96, type: 'select', options: WORKSHOPS.map((w) => w.key) },
  { key: 'pn', label: '料号', width: 120 },
  { key: 'part', label: '品名', width: 120 },
  { key: 'item', label: '检验项', width: 150 },
  { key: 'spec', label: '规格 / 标准', width: 150 },
  { key: 'meas', label: '实测 / 判定说明', width: 130 },
  { key: 'result', label: '判定', width: 74, type: 'select', options: ['OK', 'NG'] },
  {
    key: 'confirm',
    label: 'NG 确认',
    width: 150,
    format: (r) => faNgConfirmLabel(String(r.result || ''), String(r.stage || '')),
  },
  { key: 'who', label: '检验员', width: 84 },
  { key: 'fb', label: '反馈(min)', width: 84, type: 'num' },
  { key: 'iv', label: '介入(min)', width: 84, type: 'num' },
  {
    key: 'status',
    label: '状态',
    width: 92,
    type: 'select',
    options: ['已放行', '已关闭', '整改中', '待介入'],
  },
  { key: 'action', label: '临时 / 永久对策', width: 200 },
  { key: 'eng', label: '工艺 / 工程', width: 90 },
  { key: 'src', label: '来源', width: 70, type: 'select', options: ['实测', '案例'] },
]

function persist(): void {
  store.persist()
}

const stdQ = ref('')
const stdT = ref('')
const stdC = ref('')
const cats = stdCats()
const filtered = computed(() =>
  stdFiltered({ q: stdQ.value, t: stdT.value, c: stdC.value })
)
function stdTypeColor(t: string) {
  return STD_TYPE_META[t] || { label: '其他', color: '#64748b', bg: '#f1f5f9' }
}
async function copyPath(it: StdItem): Promise<void> {
  const text = stdPath(it)
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`已复制路径：${text}`)
  } catch {
    ElMessage.warning(`浏览器未授权剪贴板，请手动复制：${text}`)
  }
}
function openStd(it: StdItem): void {
  if (stdPreviewable(it)) {
    window.open(stdUrl(it), '_blank')
    return
  }
  void copyPath(it)
}
function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, d)}%`
}
</script>

<style scoped>
.fa-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.std-panel {
  position: sticky;
  top: 0;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
}
.std-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.std-head h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.std-filters {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.std-search {
  width: 100%;
  padding: 6px 9px;
  border: 1px solid #dbe3ee;
  border-radius: 6px;
  font-size: 12px;
}
.std-selects {
  display: flex;
  gap: 6px;
}
.std-list {
  margin-top: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 80px;
}
.std-item {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 7px 0;
  border-bottom: 1px solid #f1f5f9;
}
.std-type {
  flex: none;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
}
.std-main {
  flex: 1;
  min-width: 0;
}
.std-name {
  font-size: 12px;
  color: #1f2733;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.std-path {
  font-size: 10.5px;
  color: #8b9bb0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.std-actions {
  flex: none;
  display: flex;
  gap: 4px;
}
.std-actions button {
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 10.5px;
  color: #3b6fe0;
  cursor: pointer;
}
.std-empty {
  font-size: 12px;
  color: #8b9bb0;
  padding: 12px 0;
}
.std-note {
  margin: 8px 0 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: #8b9bb0;
}
.fa-main {
  min-width: 0;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
}
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}
.step {
  padding: 8px 10px;
  border: 1px solid #e3e8f0;
  border-left: 3px solid #94a3b8;
  border-radius: 6px;
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
}
.step-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #334155;
  color: #fff;
  font-size: 10.5px;
}
.step--dan .step-n {
  background: #dc2626;
}
.step--warn .step-n {
  background: #d97706;
}
.step-head b {
  font-size: 12px;
}
.step p {
  margin: 5px 0;
  font-size: 11px;
  line-height: 1.55;
  color: #566070;
}
.step-meta {
  font-size: 10.5px;
  color: #7a8494;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 14px;
}
.focus-kpis {
  display: flex;
  gap: 24px;
  margin-bottom: 10px;
}
.focus-kpi {
  display: flex;
  flex-direction: column;
  font-size: 11.5px;
  color: #7a8494;
}
.focus-kpi b {
  font-size: 18px;
  color: #1f2733;
}
.focus-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.focus-label {
  font-size: 11.5px;
  color: #7a8494;
  margin-bottom: 4px;
}
.focus-months {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.focus-months span {
  padding: 2px 7px;
  border-radius: 999px;
  background: #f4f7fb;
  font-size: 11px;
  color: #566070;
}
.focus-months b {
  color: #b91c1c;
  margin-left: 3px;
}
.focus-note {
  margin: 10px 0 0;
  font-size: 11px;
  color: #8b9bb0;
}
.stage-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
@media (max-width: 1100px) {
  .fa-layout {
    grid-template-columns: 1fr;
  }
  .std-panel {
    position: static;
    max-height: 360px;
  }
}
</style>
