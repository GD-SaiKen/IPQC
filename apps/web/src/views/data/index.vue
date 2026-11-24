<template>
  <div class="page-scroll">
    <div v-if="!store.storageOk" class="banner banner--dan no-print">
      本机存储写入失败（可能已满或被浏览器限制）。请立即导出 JSON 备份，避免刷新后丢失编辑。
    </div>

    <SectionCard title="数据与设置" subtitle="台账保存在服务器 · 可导出当前快照 JSON">
      <div class="actions no-print">
        <el-button type="primary" :loading="exporting" @click="onExport">导出服务器台账 JSON</el-button>
      </div>
      <p class="muted small">
        单元格编辑自动写入服务器 · 最近本地提示：{{ store.lastSavedAt || '—' }}
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
          <el-button
            type="primary"
            :loading="previewing"
            :disabled="!canRunPreview"
            @click="onPreviewSync"
          >
            核对解析
          </el-button>
          <span v-if="savedSelection" class="muted small sync-preview-hint">
            核对只读取已保存的文件绑定，与树上尚未保存的勾选无关。
          </span>
          <span v-else-if="previewDisabledHint" class="muted small sync-preview-hint">
            {{ previewDisabledHint }}
          </span>
        </div>
        <div v-if="savedSelection" class="sync-saved">
          <h5 class="sync-subtitle">已保存的文件绑定</h5>
          <p class="muted small">
            共享盘：{{ savedShareLabel }} · 保存于 {{ formatSavedAt(savedSelection.savedAt) }} ·
            已绑定 {{ savedSelection.payload.selectedEntries.length }} 个文件。同步只打开这些路径。
          </p>
          <div class="sync-saved-table">
            <table class="sync-runs-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th>列模板</th>
                  <th>路径</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in savedSelection.payload.selectedEntries" :key="row.path">
                  <td>{{ roleLabel(row.role || '') }}</td>
                  <td>{{ templateLabelForRole(row.role || '') }}</td>
                  <td>{{ row.path }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else-if="dataHubLinked" class="sync-saved sync-saved--empty">
          <p class="muted small">尚未保存文件绑定。在树中勾选候选文件后，于下表按角色指定路径，再点「保存选择」。</p>
          <p v-if="legacyBindingNotice" class="muted small">此前按目录保存的范围已停用，请按文件重新绑定。</p>
        </div>
        <h5 class="sync-subtitle">指定台账文件</h5>
        <div class="sync-form sync-form--edit">
          <el-select
            v-model="shareId"
            placeholder="选择已就绪的共享盘以浏览目录"
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
        </div>
        <div v-if="dataHubLinked" class="sync-form sync-form--schedule">
          <span class="muted small">每日自动同步（上海）</span>
          <el-input-number v-model="syncHour" :min="0" :max="23" controls-position="right" />
          <span class="sync-colon">:</span>
          <el-input-number v-model="syncMinute" :min="0" :max="59" controls-position="right" />
        </div>
        <p v-if="selectionDirty && savedSelection" class="muted small sync-dirty-hint">
          树上勾选与已保存范围不一致；核对解析仍使用上方已保存内容。调整完成后请点「保存选择」。
        </p>
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
            展开目录会把文件加入下方候选列表，可勾选目录缩小范围；按角色选路径即可，不必为每个勾选文件单独指定角色。
          </p>
          <p v-if="shareId" class="muted small sync-selection-hint">
            候选路径 {{ candidatePaths.length }} 个 · 树上勾选 {{ selectedFiles.length }} 个 · 已绑定角色
            {{ boundRoleCount }} / {{ LEDGER_ROLE_OPTIONS.length }}
          </p>
          <LedgerRoleBindingTable v-model="roleToPath" :candidate-files="candidatePaths" />
          <div class="sync-form sync-form--edit sync-save-row">
            <el-button
              type="primary"
              :disabled="!canSaveSelection"
              :loading="savingSelection"
              @click="onSaveSelection"
            >
              保存选择
            </el-button>
            <span v-if="saveDisabledHint" class="muted small">{{ saveDisabledHint }}</span>
          </div>
        </div>
        <ul v-if="disabledShares.length" class="sync-hint muted small">
          <li v-for="item in disabledShares" :key="item.id">
            {{ item.name }}：{{ item.status }}，请先在 data-hub 完成绑定与凭据
          </li>
        </ul>
        <div v-if="syncRuns.length" class="sync-runs">
          <h5 class="sync-subtitle">最近同步轮次</h5>
          <table class="sync-runs-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>状态</th>
                <th>新增</th>
                <th>跳过</th>
                <th>差异</th>
                <th>说明</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in syncRuns" :key="row.id">
                <td class="nowrap">{{ formatSavedAt(row.startedAt) }}</td>
                <td>{{ row.runType === 'scheduled' ? '定时' : '手动' }}</td>
                <td>{{ row.status }}</td>
                <td>{{ row.addedCount }}</td>
                <td>{{ row.skippedCount }}</td>
                <td>{{ row.diffCount }}</td>
                <td class="sync-run-msg">{{ row.message || '—' }}</td>
                <td>
                  <el-button
                    v-if="row.diffCount > 0"
                    type="primary"
                    link
                    @click="openRunDiffs(row.id)"
                  >
                    差异
                  </el-button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="activeDiffRunId" class="sync-diffs">
            <h6 class="sync-subtitle">差异明细</h6>
            <p v-if="diffLoading" class="muted small">加载中…</p>
            <table v-else-if="syncDiffs.length" class="sync-runs-table">
              <thead>
                <tr>
                  <th>表</th>
                  <th>字段</th>
                  <th>共享盘</th>
                  <th>系统</th>
                  <th>类型</th>
                  <th>跳转</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in syncDiffs" :key="d.id">
                  <td>{{ d.tableName }}</td>
                  <td>{{ d.field }}</td>
                  <td>{{ d.shareValue || '—' }}</td>
                  <td>{{ d.gridValue || '—' }}</td>
                  <td>{{ d.kind }}</td>
                  <td>
                    <el-button
                      v-if="d.kind !== 'unmatched' && diffLinkTarget(d.tableName, d.rowId, d.workshop, d.month)"
                      type="primary"
                      link
                      @click="jumpDiff(d)"
                    >
                      打开
                    </el-button>
                    <span v-else class="muted small">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="muted small">该轮次无差异记录。</p>
          </div>
        </div>
        <div v-if="previewResult" class="sync-preview sync-preview--crud">
          <p v-if="previewResult.summary" class="muted small">
            已绑定 {{ previewResult.summary.total }} 个，已解析 {{ previewResult.summary.parsed }} 个，解析失败
            {{ previewResult.files.filter((file) => file.status === 'invalid').length }} 个
          </p>
          <p
            v-if="previewResult.issues.some((issue) => issue.type === 'missing_role')"
            class="muted small sync-selection-hint"
          >
            未绑定的角色只作提示，不删除服务器上已有的行；列对不上的文件不入库。
          </p>
          <ul v-if="previewResult.issues.length" class="sync-issues">
            <li v-for="(issue, index) in previewResult.issues" :key="`${issue.type}-${index}`">{{ issue.message }}</li>
          </ul>
          <LedgerSyncPreview
            v-model:filter="previewFilter"
            :files="previewResult.files"
          />
          <p v-if="syncDisabledHint" class="muted small sync-disabled-hint">{{ syncDisabledHint }}</p>
          <div class="actions" style="margin-top: 12px">
            <el-button
              type="primary"
              :loading="syncing"
              :disabled="!canConfirmPreview"
              @click="onConfirmSync"
            >
              立即同步到服务器
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Refresh, SwitchButton } from '@element-plus/icons-vue'
import type { TreeInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDataHubLinkStatus, startDataHubLink, unlinkDataHubLink } from '@/api/auth'
import {
  listLedgerShares,
  listShareDirectories,
  fetchSyncConfig,
  previewLedgerSync,
  putSyncConfig,
  listLedgerSyncRunDiffs,
  listLedgerSyncRuns,
  runLedgerSync,
  type LedgerSyncRunListItem,
  type LedgerShareItem,
  type PreviewIssue,
  type PreviewLedgerFile,
  type PreviewSummary,
} from '@/api/ledger-sync'
import {
  bindingSaveErrorFromRoleMap,
  boundPathCount,
  entriesFromRoleToPath,
  isCompleteBindingSelection,
  LEDGER_ROLE_OPTIONS,
  roleLabel,
  roleToPathFromEntries,
  templateLabelForRole,
} from '@/views/data/ledger-bindings'
import LedgerRoleBindingTable from '@/components/ledger-role-binding-table/ledger-role-binding-table.vue'
import {
  canConfirmSync,
  explainSyncDisabled,
  isSameSelection,
  type PreviewFilter,
  type SavedLedgerSelection,
  type SyncSelectionPayload,
} from '@/views/data/ledger-selection'
import { request } from '@/utils/request'
import LedgerSyncPreview from '@/components/ledger-sync-preview/ledger-sync-preview.vue'
import SectionCard from '@/components/section-card/section-card.vue'
import { downloadBlob, downloadCsv } from '@/composables/use-table-export'
import type { CsvColumn } from '@/composables/use-table-export'
import { CALIBER_GROUPS, DATA_SOURCES } from '@/domain/ipqc/sources'
import { exportLedgerJson } from '@/api/ledger'
import { diffLinkTarget } from '@/composables/ledger-table-key'
import { useIpqcStore } from '@/stores/ipqc'
import { useRouter } from 'vue-router'

const store = useIpqcStore()
const router = useRouter()
const shares = ref<LedgerShareItem[]>([])
const shareId = ref('')
const treeRef = ref<TreeInstance>()
const selectedFiles = ref<string[]>([])
const treeListedFiles = ref<string[]>([])
const excludedPaths = ref<string[]>([])
const roleToPath = ref<Record<string, string>>({})
const boundRoleCount = computed(() => boundPathCount(roleToPath.value))
const candidatePaths = computed(() => {
  const set = new Set<string>()
  for (const path of treeListedFiles.value) {
    set.add(path)
  }
  for (const path of selectedFiles.value) {
    set.add(path)
  }
  for (const path of Object.values(roleToPath.value)) {
    if (path.trim()) {
      set.add(path)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})
const legacyBindingNotice = ref(false)
const previewFilter = ref<PreviewFilter>('all')
const savedSelection = ref<SavedLedgerSelection | null>(null)
const pendingTreeRestore = ref<SyncSelectionPayload | null>(null)
const restoringTree = ref(false)
const syncHour = ref(6)
const syncMinute = ref(0)
const savingSelection = ref(false)
const syncRuns = ref<LedgerSyncRunListItem[]>([])
const exporting = ref(false)
const activeDiffRunId = ref('')
const syncDiffs = ref<
  Array<{
    id: string
    tableName: string
    rowId: string | null
    field: string
    shareValue: string
    gridValue: string
    kind: string
    workshop: string | null
    month: string | null
  }>
>([])
const diffLoading = ref(false)

function applyPayloadToTreeState(payload: SyncSelectionPayload): void {
  excludedPaths.value = []
  const paths = payload.selectedEntries.filter((item) => item.kind === 'file').map((item) => item.path)
  selectedFiles.value = paths
  treeListedFiles.value = [...new Set([...treeListedFiles.value, ...paths])]
  roleToPath.value = roleToPathFromEntries(payload.selectedEntries)
}

function restoreTreeSelection(): void {
  const payload = pendingTreeRestore.value
  const tree = treeRef.value
  if (!payload || !tree) {
    return
  }
  restoringTree.value = true
  try {
    tree.setCheckedKeys(
      payload.selectedEntries.filter((item) => item.kind === 'file').map((item) => item.path),
      true,
    )
    for (const excluded of payload.excludedPaths) {
      const node = tree.getNode(excluded)
      if (node) {
        tree.setChecked(excluded, false, true)
      }
    }
    const nodes = tree.getCheckedNodes(true, false) as TreeNodeData[]
    selectedFiles.value = nodes.map((item) => item.path)
  } finally {
    restoringTree.value = false
  }
}

watch(shareId, async (next, prev) => {
  if (prev !== undefined && next !== prev) {
    treeListedFiles.value = []
  }
  const draft =
    next && savedSelection.value?.shareId === next ? savedSelection.value.payload : null
  pendingTreeRestore.value = draft
  if (pendingTreeRestore.value) {
    applyPayloadToTreeState(pendingTreeRestore.value)
  } else {
    selectedFiles.value = []
    excludedPaths.value = []
    roleToPath.value = {}
  }
  await nextTick()
  await nextTick()
  if (pendingTreeRestore.value) {
    restoreTreeSelection()
  } else {
    treeRef.value?.setCheckedKeys([])
  }
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

const syncPayload = computed<SyncSelectionPayload>(() => ({
  selectedEntries: entriesFromRoleToPath(roleToPath.value),
  excludedPaths: [],
}))

const bindingDraftError = computed(() => bindingSaveErrorFromRoleMap(roleToPath.value))
const canSaveSelection = computed(
  () => Boolean(shareId.value && dataHubLinked.value && bindingDraftError.value === ''),
)
const saveDisabledHint = computed(() => {
  if (!dataHubLinked.value) {
    return '请先连接 data-hub'
  }
  if (!shareId.value) {
    return '请选择共享盘'
  }
  return bindingDraftError.value
})
const previewDisabledHint = computed(() => {
  if (!dataHubLinked.value) {
    return '请先连接 data-hub 后再保存绑定。'
  }
  if (!savedSelection.value) {
    return '请在下表至少为一个角色选择文件，并点「保存选择」。'
  }
  if (!isCompleteBindingSelection(savedSelection.value.payload.selectedEntries)) {
    return '已保存的绑定数据不完整，请重新指定角色后保存。'
  }
  const id = savedSelection.value.shareId
  if (!readyShares.value.some((item) => item.id === id)) {
    return '所保存的共享盘当前不可用。'
  }
  return ''
})
const selectionDirty = computed(() => {
  if (restoringTree.value || !savedSelection.value) {
    return false
  }
  if (shareId.value && savedSelection.value.shareId !== shareId.value) {
    return false
  }
  return !isSameSelection(savedSelection.value.payload, syncPayload.value)
})
const canRunPreview = computed(() => {
  if (!dataHubLinked.value || !savedSelection.value) {
    return false
  }
  if (!isCompleteBindingSelection(savedSelection.value.payload.selectedEntries)) {
    return false
  }
  return readyShares.value.some((item) => item.id === savedSelection.value!.shareId)
})
const savedShareLabel = computed(() => {
  const id = savedSelection.value?.shareId
  if (!id) {
    return '—'
  }
  const match = shares.value.find((item) => item.id === id)
  return match ? `${match.name}（${match.status}）` : id
})
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
    const rows = data.list ?? []
    const listedFiles = rows.filter((item) => item.kind === 'file').map((item) => item.path)
    if (listedFiles.length) {
      treeListedFiles.value = [...new Set([...treeListedFiles.value, ...listedFiles])]
    }
    resolve(
      rows.map((item) => ({
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
  await nextTick()
  if (pendingTreeRestore.value) {
    restoreTreeSelection()
  } else if (!restoringTree.value) {
    syncSelectionFromTree()
  }
}

function syncSelectionFromTree(): void {
  pendingTreeRestore.value = null
  const nodes = (treeRef.value?.getCheckedNodes(true, false) as TreeNodeData[] | undefined) ?? []
  selectedFiles.value = [...new Set(nodes.map((item) => item.path))]
}

function onTreeCheck(): void {
  if (restoringTree.value) {
    return
  }
  syncSelectionFromTree()
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

const canConfirmPreview = computed(() => {
  if (!previewResult.value) {
    return false
  }
  return canConfirmSync(previewResult.value.issues, previewResult.value.files)
})

const syncDisabledHint = computed(() => {
  if (!previewResult.value || canConfirmPreview.value) {
    return ''
  }
  return explainSyncDisabled(previewResult.value.issues, previewResult.value.files)
})

const readyShares = computed(() => shares.value.filter((item) => item.status === 'ready'))
const disabledShares = computed(() =>
  shares.value.filter((item) => item.status !== 'ready' && item.name.trim() !== ''),
)

async function hydrateSavedSelection(): Promise<void> {
  try {
    const cfg = await fetchSyncConfig()
    syncHour.value = cfg.hour
    syncMinute.value = cfg.minute
    savedSelection.value = null
    legacyBindingNotice.value = false
    if (cfg.shareId && Array.isArray(cfg.selectedEntries) && cfg.selectedEntries.length > 0) {
      if (!shareId.value) {
        shareId.value = cfg.shareId
      }
      roleToPath.value = roleToPathFromEntries(cfg.selectedEntries)
      treeListedFiles.value = [
        ...new Set(
          cfg.selectedEntries.filter((item) => item.kind === 'file').map((item) => item.path),
        ),
      ]
      if (!isCompleteBindingSelection(cfg.selectedEntries)) {
        legacyBindingNotice.value = true
        return
      }
      const payload: SyncSelectionPayload = {
        selectedEntries: cfg.selectedEntries,
        excludedPaths: [],
      }
      savedSelection.value = {
        shareId: cfg.shareId,
        payload,
        savedAt: cfg.updatedAt ?? new Date().toISOString(),
      }
    }
  } catch {
    savedSelection.value = null
  }
}

async function refreshSyncRuns(): Promise<void> {
  try {
    const data = await listLedgerSyncRuns({ page: 1, pageSize: 10 })
    syncRuns.value = data.list
  } catch {
    syncRuns.value = []
  }
}

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

onMounted(async () => {
  await refreshLinkAndShares()
  await hydrateSavedSelection()
  await refreshSyncRuns()
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
    selectedFiles.value = []
    excludedPaths.value = []
    roleToPath.value = {}
    previewResult.value = null
    savedSelection.value = null
    legacyBindingNotice.value = false
    ElMessage.success('已解除 data-hub 连接')
  } finally {
    unlinking.value = false
  }
}

function formatSavedAt(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19)
}

async function onSaveSelection(): Promise<void> {
  if (!shareId.value || !canSaveSelection.value || savingSelection.value) {
    return
  }
  savingSelection.value = true
  try {
    const cfg = await putSyncConfig({
      shareId: shareId.value,
      selectedEntries: syncPayload.value.selectedEntries,
      excludedPaths: [],
      hour: syncHour.value,
      minute: syncMinute.value,
    })
    const payload: SyncSelectionPayload = {
      selectedEntries: cfg.selectedEntries,
      excludedPaths: [],
    }
    savedSelection.value = {
      shareId: shareId.value,
      payload,
      savedAt: cfg.updatedAt ?? new Date().toISOString(),
    }
    legacyBindingNotice.value = false
    pendingTreeRestore.value = { ...payload }
    previewResult.value = null
    await nextTick()
    restoreTreeSelection()
    ElMessage.success('已保存文件绑定（全厂生效）')
  } finally {
    savingSelection.value = false
  }
}

async function onPreviewSync(): Promise<void> {
  if (!canRunPreview.value || !savedSelection.value) return
  previewing.value = true
  previewFilter.value = 'all'
  try {
    previewResult.value = await previewLedgerSync({
      shareId: savedSelection.value.shareId,
      selectedEntries: savedSelection.value.payload.selectedEntries,
      excludedPaths: savedSelection.value.payload.excludedPaths,
    })
  } finally {
    previewing.value = false
  }
}

async function onConfirmSync(): Promise<void> {
  if (!previewResult.value || !savedSelection.value) return
  try {
    await ElMessageBox.confirm(
      '确认后将把共享盘解析结果写入服务器台账：新增入库、相同跳过、不同以当前页面为准并记录差异；点检得分只读更新。',
      '立即同步',
      { type: 'warning', confirmButtonText: '开始同步', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  syncing.value = true
  try {
    const data = await runLedgerSync({
      previewFiles: previewResult.value.files.map((file) => ({
        path: file.path,
        modifiedAt: file.modifiedAt,
      })),
    })
    await store.loadLedger()
    await refreshSyncRuns()
    previewResult.value = null
    const diffHint = data.diffCount > 0 ? `，差异 ${data.diffCount} 条（以页面为准）` : ''
    ElMessage.success(
      `同步完成：新增 ${data.addedCount}、跳过 ${data.skippedCount}${diffHint}`,
    )
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

async function onExport(): Promise<void> {
  exporting.value = true
  try {
    const data = await exportLedgerJson()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `ipqc-ledger-${new Date().toISOString().slice(0, 10)}.json`)
    ElMessage.success('已从服务器导出台账 JSON')
  } finally {
    exporting.value = false
  }
}

async function openRunDiffs(runId: string): Promise<void> {
  activeDiffRunId.value = runId
  diffLoading.value = true
  try {
    const data = await listLedgerSyncRunDiffs(runId, { page: 1, pageSize: 50 })
    syncDiffs.value = data.list
  } catch {
    syncDiffs.value = []
  } finally {
    diffLoading.value = false
  }
}

function jumpDiff(row: (typeof syncDiffs.value)[number]): void {
  if (row.kind === 'unmatched') return
  const target = diffLinkTarget(row.tableName, row.rowId, row.workshop, row.month)
  if (!target) return
  void router.push({ path: target.path, query: target.query })
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
.sync-form--schedule {
  margin-top: 8px;
  gap: 8px;
}
.sync-colon {
  font-weight: 600;
}
.sync-runs {
  margin-top: 16px;
}
.sync-diffs {
  margin-top: 12px;
}
.sync-runs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sync-runs-table th,
.sync-runs-table td {
  border: 1px solid #e8ecf0;
  padding: 6px 8px;
  text-align: left;
}
.sync-run-msg {
  max-width: 220px;
  word-break: break-word;
}
.sync-form--edit {
  margin-top: 6px;
}
.sync-save-row {
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 8px;
}
.sync-preview-hint {
  margin-left: 4px;
}
.sync-subtitle {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.sync-subtitle:first-of-type {
  margin-top: 8px;
}
.sync-share {
  width: 260px;
}
.sync-saved--empty {
  padding: 10px 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
}
.sync-saved {
  margin-top: 12px;
}
.sync-dirty-hint {
  margin: 8px 0 0;
  color: #b45309;
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
.sync-preview--crud {
  margin-top: 10px;
}
.sync-saved-table {
  max-height: 280px;
  overflow: auto;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  background: #fff;
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
