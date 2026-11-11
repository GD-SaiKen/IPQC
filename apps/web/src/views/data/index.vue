<template>
  <div class="page-scroll">
    <div v-if="!store.storageOk" class="banner banner--dan no-print">
      本机存储写入失败（可能已满或被浏览器限制）。请立即导出 JSON 备份，避免刷新后丢失编辑。
    </div>

    <SectionCard title="数据与设置" subtitle="本机 localStorage 自动保存 · 建议每月导出 JSON">
      <div class="actions no-print">
        <el-button type="primary" @click="onExport">导出 JSON 备份</el-button>
        <el-button @click="pickFile">导入 JSON</el-button>
        <el-button type="danger" plain @click="onReset">恢复原始种子</el-button>
        <input ref="fileRef" type="file" accept=".json" hidden @change="onFile" />
      </div>
      <p class="muted small">
        最近保存：{{ store.lastSavedAt || '尚未保存' }} · 导入会覆盖全库，恢复种子会清除本机全部编辑。
      </p>

      <div class="count-grid">
        <div v-for="t in TABLES" :key="t.key" class="count-card">
          <div class="count-label">{{ t.label }}</div>
          <div class="count-value">{{ counts[t.key] }}</div>
          <button
            type="button"
            class="csv-btn no-print"
            @click="exportCsv(t.key)"
          >导出 CSV</button>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="数据来源" subtitle="真实台账与生成数据">
      <div class="table-wrap">
        <table class="src-table">
          <thead>
            <tr>
              <th>源文件</th>
              <th>用途</th>
              <th>规模</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in DATA_SOURCES" :key="s.file">
              <td class="file">{{ s.file }}</td>
              <td>{{ s.use }}</td>
              <td class="nowrap">{{ s.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>

    <SectionCard title="口径说明" subtitle="空值、归并、达标线以本节为准">
      <div class="caliber">
        <div v-for="g in CALIBER_GROUPS" :key="g.title" class="caliber-group">
          <h4>{{ g.title }}</h4>
          <ul>
            <li v-for="(line, i) in g.rows" :key="i">{{ line }}</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SectionCard from '@/components/section-card/section-card.vue'
import { downloadBlob, downloadCsv } from '@/composables/use-table-export'
import type { CsvColumn } from '@/composables/use-table-export'
import { CALIBER_GROUPS, DATA_SOURCES } from '@/domain/ipqc/sources'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const fileRef = ref<HTMLInputElement | null>(null)

interface TableDef {
  key: string
  label: string
  columns: CsvColumn[]
}

const TABLES: TableDef[] = [
  {
    key: 'fa',
    label: '首件 / 巡检',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'pn', label: '料号' },
      { key: 'part', label: '品名' },
      { key: 'item', label: '检验项' },
      { key: 'stage', label: '阶段' },
      { key: 'dept', label: '车间' },
      { key: 'result', label: '判定' },
      { key: 'who', label: '检验员' },
      { key: 'fb', label: '反馈(min)' },
      { key: 'iv', label: '介入(min)' },
      { key: 'status', label: '状态' },
      { key: 'action', label: '对策' },
    ],
  },
  {
    key: 'fqcNg',
    label: '终检 NG 明细',
    columns: [
      { key: 'ws', label: '车间' },
      { key: 'd', label: '日期' },
      { key: 'pn', label: '料号' },
      { key: 'lot', label: '批次' },
      { key: 'samp', label: '抽检 pcs' },
      { key: 'bad', label: '不良 pcs' },
      { key: 'cat', label: '不良类别' },
      { key: 'defs', label: '不良描述' },
      { key: 'who', label: '检验员' },
      { key: 'act', label: '处理' },
    ],
  },
  {
    key: 'fqc',
    label: '终检清查',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'pn', label: '料号' },
      { key: 'part', label: '品名' },
      { key: 'issue', label: '不良问题' },
      { key: 'checker', label: '检查人' },
      { key: 'depts', label: '涉及车间' },
      { key: 'stock', label: '库存' },
      { key: 'ng', label: '不良数' },
      { key: 'note', label: '备注' },
      { key: 'action', label: '对策' },
    ],
  },
  {
    key: 'cmp',
    label: '零件投诉',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'from', label: '投诉来源' },
      { key: 'dept', label: '责任车间' },
      { key: 'part', label: '零件' },
      { key: 'pn', label: '料号' },
      { key: 'issue', label: '问题' },
      { key: 'cause', label: '原因' },
      { key: 'owner', label: '责任人' },
      { key: 'actClose', label: '实际结案' },
      { key: 'repeat', label: '重复投诉' },
    ],
  },
  {
    key: 'mat',
    label: '培训资料',
    columns: [
      { key: 't', label: '资料名称' },
      { key: 'dept', label: '适用车间' },
      { key: 'type', label: '类型' },
      { key: 'ver', label: '版本' },
      { key: 'date', label: '日期' },
      { key: 'pages', label: '页数' },
    ],
  },
  {
    key: 'trn',
    label: '培训实施',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'dept', label: '车间' },
      { key: 'topic', label: '主题' },
      { key: 'trainer', label: '讲师' },
      { key: 'num', label: '人次' },
      { key: 'hours', label: '学时' },
      { key: 'way', label: '方式' },
      { key: 'pass', label: '通过率' },
    ],
  },
  {
    key: 'exam',
    label: '培训考核',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'who', label: '姓名' },
      { key: 'dept', label: '车间' },
      { key: 'subject', label: '科目' },
      { key: 'score', label: '得分' },
      { key: 'level', label: '等级' },
    ],
  },
  {
    key: 'perf',
    label: '绩效明细',
    columns: [
      { key: 'date', label: '日期' },
      { key: 'dept', label: '车间' },
      { key: 'who', label: '姓名' },
      { key: 'attr', label: '维度' },
      { key: 'item', label: '事项' },
      { key: 'score', label: '分值' },
    ],
  },
]

const counts = computed<Record<string, number>>(() => ({
  fa: store.db.fa.length,
  fqcNg: store.db.fqcNg.length,
  fqc: store.db.fqc.length,
  cmp: store.db.cmp.length,
  mat: store.db.mat.length,
  trn: store.db.trn.length,
  exam: store.db.exam.length,
  perf: store.db.perf.length,
}))

function rowsOf(key: string): Record<string, unknown>[] {
  if (key === 'fa') return store.db.fa as unknown as Record<string, unknown>[]
  if (key === 'fqcNg') return store.db.fqcNg
  if (key === 'fqc') return store.db.fqc
  if (key === 'cmp') return store.db.cmp as unknown as Record<string, unknown>[]
  if (key === 'mat') return store.db.mat
  if (key === 'trn') return store.db.trn
  if (key === 'exam') return store.db.exam
  return store.db.perf as unknown as Record<string, unknown>[]
}

function exportCsv(key: string): void {
  const t = TABLES.find((x) => x.key === key)
  if (!t) return
  downloadCsv(`IPQC_${t.label}`, t.columns, rowsOf(key))
}

function onExport(): void {
  const blob = new Blob([store.exportJson()], { type: 'application/json' })
  downloadBlob(blob, `ipqc-backup-${new Date().toISOString().slice(0, 10)}.json`)
  ElMessage.success('JSON 备份已导出')
}

function pickFile(): void {
  fileRef.value?.click()
}

async function onFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await ElMessageBox.confirm(
      `导入「${file.name}」将覆盖本机全库数据（含未导出的编辑），是否继续？`,
      '导入 JSON 备份',
      { type: 'warning', confirmButtonText: '覆盖导入', cancelButtonText: '取消' }
    )
  } catch {
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    try {
      store.importFromJson(String(reader.result))
      ElMessage.success('导入成功，页面数据已更新')
    } catch {
      ElMessage.error('文件格式无效，未导入任何数据')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

async function onReset(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '将清除本机所有编辑并恢复种子数据。建议先导出 JSON 备份，是否继续？',
      '恢复原始种子',
      { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消' }
    )
    await ElMessageBox.confirm(
      '再次确认：本机编辑会被清掉且无法撤销。',
      '二次确认',
      { type: 'error', confirmButtonText: '确认清除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  store.restoreSeed()
  ElMessage.success('已恢复原始种子数据')
}
</script>

<style scoped>
.banner {
  padding: 9px 13px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 12px;
}
.banner--dan {
  background: #fff1f0;
  border: 1px solid #f1d5d1;
  color: #b91c1c;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.muted {
  color: #64748b;
}
.small {
  font-size: 11.5px;
}
.count-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.count-card {
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fbfcfe;
}
.count-label {
  font-size: 11.5px;
  color: #64748b;
}
.count-value {
  font-size: 20px;
  font-weight: 700;
  margin: 2px 0 6px;
}
.csv-btn {
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 11px;
  color: #3b6fe0;
  cursor: pointer;
}
.table-wrap {
  overflow-x: auto;
}
.src-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.src-table th,
.src-table td {
  padding: 7px 9px;
  border-bottom: 1px solid #edf1f6;
  text-align: left;
  vertical-align: top;
  line-height: 1.6;
}
.src-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}
.src-table .file {
  min-width: 200px;
  color: #1f2733;
}
.nowrap {
  white-space: nowrap;
}
.caliber {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
}
.caliber-group h4 {
  margin: 0 0 5px;
  font-size: 12.5px;
  color: #1f2733;
}
.caliber-group ul {
  margin: 0;
  padding-left: 18px;
  font-size: 11.5px;
  line-height: 1.75;
  color: #566070;
}
</style>
