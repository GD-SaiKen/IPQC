<template>
  <!-- 复制到 src/views/orders/index.vue（目录名按业务改）。
       这一页就是「列表页」的标准写法：筛选 + 表格 + 分页 + 新建/编辑弹窗，
       页面里不出现任何列宽、对齐、按钮排布的手工样式。 -->
  <Crud
    class="order-page"
    :filter-items="filterItems"
    v-model:filter-values="filters"
    :pagination="pagination"
    @filter-change="reload"
  >
    <template #filters-actions>
      <el-button type="primary" @click="openCreate">新建工单</el-button>
    </template>

    <template #table>
      <Table
        :columns="columns"
        :data="rows"
        :loading="loading"
        row-key="id"
        v-model:selection="selection"
      >
        <!-- custom 列：插槽名默认 col-{prop} -->
        <template #col-owner="{ row }">
          <el-tag size="small" type="info">{{ row.owner }}</el-tag>
        </template>
      </Table>
    </template>
  </Crud>

  <el-dialog
    v-model="dialogVisible"
    :title="editingId ? '编辑工单' : '新建工单'"
    width="680px"
    destroy-on-close
  >
    <Form ref="formRef" v-model="formModel" :sections="formSections" :label-width="'88px'" />
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Crud, Form, Table } from '@/components/crud'
import type { ColumnSchema, FilterItem, FormSection } from '@/components/crud'

interface OrderRow {
  id: number
  code: string
  title: string
  owner: string
  status: 'draft' | 'running' | 'done'
  amount: number
  createdAt: string
  remark: string
}

// ==================== 列表 ====================

const loading = ref(false)
const rows = ref<OrderRow[]>([])
const selection = ref<OrderRow[]>([])
const filters = ref<Record<string, any>>({ keyword: '', status: '' })

const filterItems: FilterItem[] = [
  { key: 'keyword', placeholder: '单号 / 标题', width: '200px' },
  {
    key: 'status',
    type: 'select',
    placeholder: '状态',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '进行中', value: 'running' },
      { label: '已完成', value: 'done' },
    ],
  },
]

/**
 * 分页对象直接传给 Crud：组件内部会改 page / pageSize，
 * 所以必须是 reactive 对象（或父级的 reactive 字段），不能每次渲染新建。
 */
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  // page / pageSize 已被 v-model 写入，这里只负责重查
  onPageChange: () => load(),
  onSizeChange: () => {
    pagination.page = 1
    load()
  },
})

const columns: ColumnSchema[] = [
  { type: 'selection' },
  { type: 'index', label: '序号', startIndex: 1 },
  // 长文本列：只给 minWidth，剩余宽度归它
  { type: 'text', prop: 'code', label: '单号', width: 120 },
  { type: 'text', prop: 'title', label: '标题', minWidth: 220 },
  { type: 'custom', prop: 'owner', label: '负责人', width: 110 },
  {
    type: 'tag',
    prop: 'status',
    label: '状态',
    width: 96,
    tagMap: { draft: 'info', running: 'warning', done: 'success' },
    formatter: (v: string) => ({ draft: '草稿', running: '进行中', done: '已完成' }[v] ?? v),
  },
  { type: 'text', prop: 'amount', label: '金额', width: 110, align: 'right' },
  { type: 'date', prop: 'createdAt', label: '创建时间', format: 'YYYY-MM-DD HH:mm' },
  {
    type: 'action',
    label: '操作',
    maxVisible: 2,
    buttons: [
      { label: '编辑', onClick: (row: OrderRow) => openEdit(row) },
      {
        label: '完成',
        hidden: (row: OrderRow) => row.status === 'done',
        onClick: (row: OrderRow) => finish(row),
      },
      { label: '删除', type: 'danger', onClick: (row: OrderRow) => remove(row) },
    ],
  },
]

async function load() {
  loading.value = true
  try {
    // TODO: 换成真实接口 → api/order.ts 里的 listOrder(params)
    const result = mockQuery({
      ...filters.value,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    rows.value = result.list
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

/** 筛选变化时回到第一页再查 */
function reload() {
  pagination.page = 1
  load()
}

// ==================== 弹窗 ====================

const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<InstanceType<typeof Form> | null>(null)
const formModel = ref<Record<string, any>>({})

const formSections: FormSection[] = [
  {
    title: '基本信息',
    cols: 2,
    boxed: true,
    fields: [
      { type: 'input', prop: 'code', label: '单号', rules: { required: true, message: '请填写单号' } },
      { type: 'input', prop: 'title', label: '标题', rules: { required: true, message: '请填写标题' } },
      {
        type: 'select',
        prop: 'owner',
        label: '负责人',
        options: [
          { label: '张三', value: '张三' },
          { label: '李四', value: '李四' },
        ],
      },
      { type: 'number', prop: 'amount', label: '金额', min: 0, step: 100 },
      { type: 'date', prop: 'dueDate', label: '交期', colSpan: 2 },
    ],
  },
  {
    title: '备注',
    boxed: true,
    fields: [
      { type: 'textarea', prop: 'remark', label: '说明', rows: 3, maxlength: 200, showWordLimit: true },
    ],
  },
]

function openCreate() {
  editingId.value = null
  formModel.value = { code: '', title: '', owner: '', amount: 0, dueDate: '', remark: '' }
  dialogVisible.value = true
}

function openEdit(row: OrderRow) {
  editingId.value = row.id
  formModel.value = { ...row }
  dialogVisible.value = true
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  saving.value = true
  try {
    // TODO: createOrder / updateOrder
    ElMessage.success(editingId.value ? '已保存' : '已创建')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function finish(row: OrderRow) {
  await ElMessageBox.confirm(`确认把「${row.title}」标记为已完成？`, '提示', { type: 'warning' })
  row.status = 'done'
  ElMessage.success('已完成')
}

async function remove(row: OrderRow) {
  await ElMessageBox.confirm(`确认删除「${row.title}」？`, '提示', { type: 'warning' })
  ElMessage.success('已删除')
  load()
}

onMounted(load)

// ==================== 假数据（接真实接口后整块删掉）====================

function mockQuery(params: Record<string, any>): { list: OrderRow[]; total: number } {
  const all: OrderRow[] = Array.from({ length: 46 }, (_, i) => ({
    id: i + 1,
    code: `WO-2026-${String(i + 1).padStart(3, '0')}`,
    title: `工单标题 ${i + 1}`,
    owner: i % 2 ? '张三' : '李四',
    status: (['draft', 'running', 'done'] as const)[i % 3],
    amount: (i + 1) * 1200,
    createdAt: new Date(2026, 10, 1 + (i % 28), 9, 30).toISOString(),
    remark: '',
  }))
  const filtered = all.filter((r) => {
    const kw = String(params.keyword ?? '').trim()
    if (kw && !r.code.includes(kw) && !r.title.includes(kw)) return false
    if (params.status && r.status !== params.status) return false
    return true
  })
  const start = (params.page - 1) * params.pageSize
  return { list: filtered.slice(start, start + params.pageSize), total: filtered.length }
}
</script>

<style scoped>
.order-page {
  height: 100%;
  min-height: 0;
}
</style>
