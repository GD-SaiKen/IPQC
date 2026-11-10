<template>
  <div class="page-scroll">
    <div class="trn-head">
      <h2>{{ key === '全部' ? '全厂' : key }} · 培训与技能</h2>
      <span class="muted small">资料库 → 实施记录 → 考核 → 技能矩阵；「通用」资料在各车间可见。</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">培训资料</div>
        <div class="value">{{ stats.materials || '—' }}</div>
        <div class="muted small">含通用资料</div>
      </div>
      <div class="kpi-card">
        <div class="label">培训场次</div>
        <div class="value">{{ stats.sessions || '—' }}</div>
        <div class="muted small">含通用场次</div>
      </div>
      <div class="kpi-card">
        <div class="label">培训人次</div>
        <div class="value">{{ stats.people || '—' }}</div>
        <div class="muted small">记录人次合计</div>
      </div>
      <div class="kpi-card">
        <div class="label">总学时</div>
        <div class="value">{{ stats.hours ? fp(stats.hours, 1) : '—' }}</div>
        <div class="muted small">人次 × 小时</div>
      </div>
      <div class="kpi-card" :class="stats.avgExam && stats.avgExam < 85 ? 'warn' : ''">
        <div class="label">考核均分</div>
        <div class="value">{{ stats.avgExam ? fp(stats.avgExam, 1) : '—' }}</div>
        <div class="muted small">
          记录通过率 {{ recList.length ? fmtPct(stats.passRate) : '—' }}
        </div>
      </div>
    </div>

    <SectionCard title="培训路径">
      <div class="tabs no-print">
        <button
          v-for="t in TRN_TABS"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ on: tab === t.key }"
          @click="tab = t.key"
        >
          {{ t.label }}
          <span class="tab-count">{{ tabCount(t.key) }}</span>
        </button>
      </div>

      <template v-if="tab === 'mat'">
        <IpqcEditableTable
          table-id="trn-mat"
          unit="份"
          file-base="培训资料"
          :rows="materials"
          :columns="matColumns"
          :page-size="10"
          placeholder="搜索资料名 / 类型 / 版本 / 车间"
          @change="persist"
        @bulk-change="persist"
        />
        <p class="foot-note">「通用」资料在本车间可见；其他车间的专用资料不在本页显示。</p>
      </template>

      <template v-else-if="tab === 'trn'">
        <IpqcEditableTable
          table-id="trn-record"
          unit="场"
          file-base="培训实施"
          :rows="records"
          :columns="trnColumns"
          :page-size="10"
          placeholder="搜索日期 / 主题 / 讲师 / 方式"
          @change="persist"
        @bulk-change="persist"
        />
      </template>

      <template v-else-if="tab === 'exam'">
        <IpqcEditableTable
          table-id="trn-exam"
          unit="人"
          file-base="培训考核"
          :rows="exams"
          :columns="examColumns"
          :page-size="10"
          placeholder="搜索日期 / 姓名 / 科目"
          @change="persist"
        @bulk-change="persist"
        />
        <p class="foot-note">考核达标色参考平均分 ≥ 85；等级 A / B / C 可在下拉中修改。</p>
      </template>

      <template v-else>
        <div class="skill-legend">
          <span v-for="[lv, label] in SKILL_LEVELS" :key="lv" class="legend-item">
            <i :class="`lv-${lv}`">{{ lv }}</i>{{ label }}
          </span>
          <span class="muted small">点击单元格按 1 → 2 → 3 → 4 → 1 循环，失焦列自动保存。</span>
        </div>
        <div v-if="skills.length" class="skill-wrap">
          <table class="skill-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>车间</th>
                <th v-for="s in SKILLS" :key="s">{{ s }}</th>
                <th>平均</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in skills" :key="row.who">
                <td>{{ row.who }}</td>
                <td>{{ row.dept }}</td>
                <td v-for="(s, si) in SKILLS" :key="s">
                  <button
                    type="button"
                    class="skill-cell"
                    :class="`lv-${row.lv?.[si] || 0}`"
                    :title="`${s}：${levelText(row.lv?.[si] || 0)}`"
                    @click="cycleSkill(row, si)"
                  >{{ row.lv?.[si] || '—' }}</button>
                </td>
                <td class="num">{{ fp(skillAverage(row.lv || []), 2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted small">当前车间暂无技能矩阵记录。</p>
        <p class="foot-note">
          等级：1 了解、2 可独立操作、3 熟练并能带徒、4 可制定标准 / 跨车间支援。
        </p>
      </template>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionCard from '@/components/section-card/section-card.vue'
import IpqcEditableTable from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import type { EditColumn } from '@/components/ipqc-editable-table/ipqc-editable-table.vue'
import { fp } from '@/domain/ipqc/format'
import {
  nextSkillLevel,
  SKILL_LEVELS,
  SKILLS,
  skillAverage,
  trainingStats,
  TRN_TABS,
  visibleExam,
  visibleMaterial,
  visibleRecord,
  visibleSkill,
} from '@/domain/ipqc/training'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import type {
  SkillRow,
  TrainingExam,
  TrainingMaterial,
  TrainingRecord,
} from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const key = computed(() => store.workshop)
const tab = ref('mat')

const matList = computed(() =>
  (store.db.mat as unknown as TrainingMaterial[]).filter((m) =>
    visibleMaterial(m, key.value)
  )
)
const recList = computed(() =>
  (store.db.trn as unknown as TrainingRecord[]).filter((r) =>
    visibleRecord(r, key.value)
  )
)
const examList = computed(() =>
  (store.db.exam as unknown as TrainingExam[]).filter((e) =>
    visibleExam(e, key.value)
  )
)
const skillList = computed(() =>
  (store.db.skill as unknown as SkillRow[]).filter((s) =>
    visibleSkill(s, key.value)
  )
)

const materials = computed(
  () => matList.value as unknown as Record<string, unknown>[]
)
const records = computed(
  () => recList.value as unknown as Record<string, unknown>[]
)
const exams = computed(
  () => examList.value as unknown as Record<string, unknown>[]
)
const skills = computed(() => skillList.value)

const stats = computed(() =>
  trainingStats(matList.value, recList.value, examList.value)
)

function tabCount(k: string): number {
  if (k === 'mat') return matList.value.length
  if (k === 'trn') return recList.value.length
  if (k === 'exam') return examList.value.length
  return skillList.value.length
}

const DEPT_OPTS = ['通用', ...WORKSHOPS.map((w) => w.key)]
const matColumns: EditColumn[] = [
  { key: 't', label: '资料名称', width: 240 },
  { key: 'dept', label: '适用车间', width: 100, type: 'select', options: DEPT_OPTS },
  {
    key: 'type',
    label: '类型',
    width: 100,
    type: 'select',
    options: ['检验标准', '作业规范', '培训教材', '限度样本', '流程文件', '考核题库'],
  },
  { key: 'ver', label: '版本', width: 76 },
  { key: 'date', label: '日期', width: 100 },
  { key: 'pages', label: '页数', width: 70, type: 'num' },
]
const trnColumns: EditColumn[] = [
  { key: 'date', label: '日期', width: 100 },
  { key: 'dept', label: '车间', width: 96, type: 'select', options: WORKSHOPS.map((w) => w.key) },
  { key: 'topic', label: '培训主题', width: 220 },
  { key: 'trainer', label: '讲师', width: 90 },
  { key: 'num', label: '人次', width: 76, type: 'num' },
  { key: 'hours', label: '学时', width: 76, type: 'num' },
  {
    key: 'way',
    label: '方式',
    width: 100,
    type: 'select',
    options: ['口试', '笔试', '实操', '实操+笔试', '现场提问', '现场', '上机', '实物判定'],
  },
  { key: 'pass', label: '通过率 %', width: 90, type: 'num' },
]
const examColumns: EditColumn[] = [
  { key: 'date', label: '日期', width: 100 },
  { key: 'who', label: '姓名', width: 90 },
  { key: 'dept', label: '车间', width: 96, type: 'select', options: WORKSHOPS.map((w) => w.key) },
  { key: 'subject', label: '考核科目', width: 200 },
  { key: 'score', label: '得分', width: 76, type: 'num' },
  { key: 'level', label: '等级', width: 76, type: 'select', options: ['A', 'B', 'C'] },
]

function cycleSkill(row: SkillRow, idx: number): void {
  const lv = row.lv || (row.lv = [])
  lv[idx] = nextSkillLevel(lv[idx] || 0)
  store.persist()
}
function levelText(lv: number): string {
  const found = SKILL_LEVELS.find(([n]) => n === lv)
  return found ? `${lv} ${found[1]}` : '未评估'
}
function persist(): void {
  store.persist()
}
function fmtPct(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${fp(v, 1)}%`
}
</script>

<style scoped>
.trn-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.trn-head h2 {
  margin: 0;
  font-size: 17px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12.5px;
  color: #566070;
  cursor: pointer;
}
.tab.on {
  background: #3b6fe0;
  border-color: #3b6fe0;
  color: #fff;
}
.tab-count {
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  font-size: 10.5px;
}
.tab.on .tab-count {
  background: rgba(255, 255, 255, 0.25);
}
.skill-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 11.5px;
  color: #566070;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend-item i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-style: normal;
  font-size: 10.5px;
  color: #fff;
}
.skill-wrap {
  overflow-x: auto;
}
.skill-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.skill-table th,
.skill-table td {
  padding: 5px 6px;
  border-bottom: 1px solid #edf1f6;
  text-align: center;
  white-space: nowrap;
}
.skill-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}
.skill-table th:first-child,
.skill-table td:first-child,
.skill-table th:nth-child(2),
.skill-table td:nth-child(2) {
  text-align: left;
}
.skill-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.skill-cell {
  width: 30px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.lv-1 {
  background: #cbd5e1;
  color: #334155;
}
.lv-2 {
  background: #a7d8b6;
  color: #0b5d35;
}
.lv-3 {
  background: #5bb98a;
}
.lv-4 {
  background: #0f9d58;
}
.lv-0 {
  background: #f1f5f9;
  color: #94a3b8;
}
.foot-note {
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: #7a8494;
}
</style>
