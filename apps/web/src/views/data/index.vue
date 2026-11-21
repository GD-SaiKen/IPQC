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

      <div class="sync-block no-print">
        <h4 class="sync-title">从共享盘同步</h4>
        <div v-if="!dataHubLinked" class="sync-auth no-print">
          <el-alert type="warning" show-icon :closable="false" title="尚未授权 data-hub 共享盘访问" />
          <el-button type="primary" class="sync-link-btn" :loading="linking" @click="onConnectDataHub">
            连接 data-hub（授权共享盘）
          </el-button>
          <p class="muted small">密码仅在 data-hub 页面输入；与本页 IPQC 登录无关。</p>
        </div>
        <div v-else class="sync-linked-row">
          <p class="muted small sync-linked">已连接 data-hub，可选择共享盘核对台账。</p>
          <div class="sync-linked-actions">
            <el-button type="primary" link :loading="linking" @click="onConnectDataHub">
              <el-icon><Refresh /></el-icon>
              重新授权
            </el-button>
            <el-button type="danger" link :loading="unlinking" @click="onUnlinkDataHub">
              <el-icon><SwitchButton /></el-icon>
              解除连接
            </el-button>
          </div>
        </div>
        <div class="sync-form">
          <el-select
            v-model="shareId"
            placeholder="选择已就绪的共享盘"
            clearable
            class="sync-share"
          >
            <el-option
              v-for="item in readyShares"
              :key="item.id"
              :label="`${item.name}（${item.status}）`"
              :value="item.id"
            />
          </el-select>
          <el-button type="primary" :loading="previewing" :disabled="!shareId || !canPreviewSync" @click="onPreviewSync">
            核对文件
          </el-button>
        </div>
        <div v-if="shareId" class="sync-tree-wrap">
          <el-tree
            ref="treeRef"
            :key="shareId"
            lazy
            show-checkbox
            node-key="path"
            :props="treeProps"
            :load="loadTreeNode"
            @check="onTreeCheck"
          />
          <p class="muted small sync-selection-hint">
            已选目录 {{ selectedDirectories.length }} · 已选文件 {{ selectedFiles.length }} · 已排除 {{ excludedPaths.length }}
          </p>
        </div>
        <ul v-if="disabledShares.length" class="sync-hint muted small">
          <li v-for="item in disabledShares" :key="item.id">
            {{ item.name }}：{{ item.status }}，请先在 data-hub 完成绑定与凭据
          </li>
        </ul>
        <div v-if="previewResult" class="sync-preview">
          <p v-if="previewResult.summary" class="muted small">
            选中 {{ previewResult.summary.total }} 个文件，已解析 {{ previewResult.summary.parsed }} 个，未解析 {{ previewResult.summary.unparsed }} 个
          </p>
          <ul v-if="previewResult.issues.length" class="sync-issues">
            <li v-for="(issue, index) in previewResult.issues" :key="`${issue.type}-${index}`">{{ issue.message }}</li>
          </ul>
          <el-radio-group v-model="previewFilter" size="small" class="sync-filter">
            <el-radio-button value="all">全部文件</el-radio-button>
            <el-radio-button value="parsed">将写入本机</el-radio-button>
            <el-radio-button value="unparsed">未解析</el-radio-button>
            <el-radio-button value="problem">存在问题</el-radio-button>
          </el-radio-group>
          <table class="src-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>路径</th>
                <th>扩展名</th>
                <th>状态</th>
                <th>原因</th>
                <th>角色</th>
                <th>修改时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in filteredPreviewFiles" :key="file.path">
                <td>{{ file.name }}</td>
                <td class="file">{{ file.path }}</td>
                <td class="nowrap">{{ file.extension }}</td>
                <td class="nowrap">{{ STATUS_LABELS[file.status] ?? file.status }}</td>
                <td>{{ file.reason || '—' }}</td>
                <td>{{ file.label || '—' }}</td>
                <td class="nowrap">{{ file.modifiedAt || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div class="actions" style="margin-top: 12px">
            <el-button
              type="primary"
              :loading="syncing"
              :disabled="!canConfirmPreview"
              @click="onConfirmSync"
            >
              确认写入本机
            </el-button>
            <el-button @click="previewResult = null">取消</el-button>
          </div>
        </div>
      </div>

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
import { computed, onMounted, ref, watch } from 'vue'
import { Refresh, SwitchButton } from '@element-plus/icons-vue'
import type { TreeInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDataHubLinkStatus, startDataHubLink, unlinkDataHubLink } from '@/api/auth'
import {
  listLedgerShares,
  listShareDirectories,
  previewLedgerSync,
  syncLedger,
  type LedgerShareItem,
  type PreviewIssue,
  type PreviewLedgerFile,
  type PreviewSummary,
} from '@/api/ledger-sync'
import {
  STATUS_LABELS,
  buildSyncSelection,
  canConfirmSync,
  canPreviewSelection,
  directoryFullyExcluded,
  filterPreviewFiles,
  isUnderPath,
  type PreviewFilter,
} from '@/views/data/ledger-selection'
import { request } from '@/utils/request'
import SectionCard from '@/components/section-card/section-card.vue'
import { downloadBlob, downloadCsv } from '@/composables/use-table-export'
import type { CsvColumn } from '@/composables/use-table-export'
import { mergeCheckScores, mergeLedgerSnapshot } from '@/domain/ipqc/merge-snapshot'
import { CALIBER_GROUPS, DATA_SOURCES } from '@/domain/ipqc/sources'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const fileRef = ref<HTMLInputElement | null>(null)
const shares = ref<LedgerShareItem[]>([])
const shareId = ref('')
const treeRef = ref<TreeInstance>()
const selectedDirectories = ref<string[]>([])
const selectedFiles = ref<string[]>([])
const excludedPaths = ref<string[]>([])
const previewFilter = ref<PreviewFilter>('all')

watch(shareId, () => {
  selectedDirectories.value = []
  selectedFiles.value = []
  excludedPaths.value = []
  previewResult.value = null
  treeRef.value?.setCheckedKeys([])
})

const treeProps = {
  label: 'label',
  isLeaf: 'leaf',
}

interface TreeNodeData {
  path: string
  name: string
  kind: 'directory' | 'file'
  label: string
  leaf: boolean
}

const syncPayload = computed(() =>
  buildSyncSelection({
    directories: selectedDirectories.value.filter(
      (dir) => !directoryFullyExcluded(dir, excludedPaths.value, selectedFiles.value),
    ),
    files: selectedFiles.value,
    excludedPaths: excludedPaths.value,
  }),
)

const canPreviewSync = computed(() => canPreviewSelection(syncPayload.value))

async function loadTreeNode(
  node: { level: number; data: TreeNodeData },
  resolve: (data: TreeNodeData[]) => void,
): Promise<void> {
  if (!shareId.value) {
    resolve([])
    return
  }
  const parentPath = node.level === 0 ? '' : node.data.path
  try {
    const data = await listShareDirectories(shareId.value, parentPath)
    resolve(
      (data.list ?? []).map((item) => ({
        path: item.path,
        name: item.name,
        kind: item.kind,
        label: item.kind === 'directory' ? item.name : item.name,
        leaf: item.kind === 'file',
      })),
    )
  } catch (error) {
    resolve([])
    if (request.isDataHubUnauthorized(error)) {
      dataHubLinked.value = false
      shares.value = []
      shareId.value = ''
    }
  }
}

function onTreeCheck(
  data: TreeNodeData,
  state: { checkedKeys: string[]; halfCheckedKeys: string[] },
): void {
  const nodes = (treeRef.value?.getCheckedNodes(false, true) as TreeNodeData[] | undefined) ?? []
  selectedDirectories.value = nodes.filter((item) => item.kind === 'directory').map((item) => item.path)
  selectedFiles.value = nodes.filter((item) => item.kind === 'file').map((item) => item.path)

  if (data.kind === 'file' && !state.checkedKeys.includes(data.path)) {
    if (selectedDirectories.value.some((dir) => isUnderPath(data.path, dir))) {
      excludedPaths.value = [...new Set([...excludedPaths.value, data.path])]
    }
  }
  if (data.kind === 'file' && state.checkedKeys.includes(data.path)) {
    excludedPaths.value = excludedPaths.value.filter((path) => path !== data.path)
  }
  if (data.kind === 'directory' && !state.checkedKeys.includes(data.path)) {
    excludedPaths.value = excludedPaths.value.filter((path) => !isUnderPath(path, data.path))
  }
}
const previewing = ref(false)
const syncing = ref(false)
const dataHubLinked = ref(false)
const linking = ref(false)
const unlinking = ref(false)
const previewResult = ref<{
  files: PreviewLedgerFile[]
  summary: PreviewSummary
  issues: PreviewIssue[]
  counts?: Record<string, number>
} | null>(null)

const filteredPreviewFiles = computed(() => {
  if (!previewResult.value) {
    return []
  }
  return filterPreviewFiles(previewResult.value.files, previewFilter.value)
})

const canConfirmPreview = computed(() => {
  if (!previewResult.value) {
    return false
  }
  return canConfirmSync(previewResult.value.issues, previewResult.value.files)
})

const readyShares = computed(() => shares.value.filter((item) => item.status === 'ready'))
const disabledShares = computed(() =>
  shares.value.filter((item) => item.status !== 'ready' && item.name.trim() !== ''),
)

async function refreshLinkAndShares(): Promise<void> {
  try {
    const status = await getDataHubLinkStatus()
    dataHubLinked.value = status.linked
  } catch {
    dataHubLinked.value = false
  }
  if (!dataHubLinked.value) {
    shares.value = []
    return
  }
  try {
    const data = await listLedgerShares()
    shares.value = data.list
  } catch (error) {
    shares.value = []
    if (request.isUnauthorized(error) || request.isDataHubUnauthorized(error)) {
      dataHubLinked.value = false
    }
  }
}

onMounted(() => {
  void refreshLinkAndShares()
})

async function onConnectDataHub(): Promise<void> {
  if (linking.value) {
    return
  }
  linking.value = true
  try {
    const { authorizeUrl } = await startDataHubLink()
    const state = new URL(authorizeUrl).searchParams.get('state')
    if (state) {
      sessionStorage.setItem('ipqc_data_hub_state', state)
    }
    window.location.assign(authorizeUrl)
  } finally {
    linking.value = false
  }
}

async function onUnlinkDataHub(): Promise<void> {
  if (unlinking.value) {
    return
  }
  try {
    await ElMessageBox.confirm(
      '解除后需重新授权才能从共享盘核对台账；本机已写入的数据不受影响。',
      '解除 data-hub 连接',
      { type: 'warning', confirmButtonText: '解除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  unlinking.value = true
  try {
    await unlinkDataHubLink()
    dataHubLinked.value = false
    shares.value = []
    shareId.value = ''
    selectedDirectories.value = []
    selectedFiles.value = []
    excludedPaths.value = []
    previewResult.value = null
    ElMessage.success('已解除 data-hub 连接')
  } finally {
    unlinking.value = false
  }
}

async function onPreviewSync(): Promise<void> {
  if (!shareId.value || !canPreviewSync.value) return
  previewing.value = true
  previewFilter.value = 'all'
  try {
    previewResult.value = await previewLedgerSync({
      shareId: shareId.value,
      selectedEntries: syncPayload.value.selectedEntries,
      excludedPaths: syncPayload.value.excludedPaths,
    })
  } finally {
    previewing.value = false
  }
}

async function onConfirmSync(): Promise<void> {
  if (!shareId.value || !previewResult.value) return
  try {
    await ElMessageBox.confirm(
      '确认后将以共享盘快照覆盖本机首件、终检、投诉、点检得分与绩效；培训资料 / 记录 / 考核 / 技能矩阵保留。',
      '写入本机台账',
      { type: 'warning', confirmButtonText: '确认写入', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  syncing.value = true
  try {
    const data = await syncLedger({
      shareId: shareId.value,
      selectedEntries: syncPayload.value.selectedEntries,
      excludedPaths: syncPayload.value.excludedPaths,
      previewFiles: previewResult.value.files.map((file) => ({
        path: file.path,
        modifiedAt: file.modifiedAt,
      })),
    })
    store.db = mergeLedgerSnapshot(store.db, data.snapshot)
    if (data.checkScores) {
      store.checkScores = mergeCheckScores(store.checkScores, data.checkScores)
    }
    store.persist()
    previewResult.value = null
    ElMessage.success('共享盘台账已写入本机')
  } finally {
    syncing.value = false
  }
}

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
.sync-block {
  margin: 16px 0 20px;
  padding: 14px 16px;
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  background: #fafbfc;
}
.sync-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.sync-auth {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
.sync-link-btn {
  margin-top: 2px;
}
.sync-linked-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.sync-linked {
  margin: 0;
}
.sync-linked-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.sync-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}
.sync-share {
  width: 260px;
}
.sync-tree-wrap {
  margin-top: 10px;
  max-height: 280px;
  overflow: auto;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.sync-selection-hint {
  margin: 8px 0 0;
}
.sync-issues {
  margin: 10px 0;
  padding-left: 18px;
  color: #b45309;
  font-size: 12px;
}
.sync-filter {
  margin: 10px 0;
}
.sync-hint {
  margin: 10px 0 0;
  padding-left: 18px;
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
