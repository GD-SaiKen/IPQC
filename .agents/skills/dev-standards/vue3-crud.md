# Vue 3 + Element Plus — CRUD 组件落地

契约（组件分工、类型、列宽规则、页面六件事）见 [crud.md](crud.md)；本文只写 Vue 3 的实现方式与页面写法。Vue 2 见 [vue2-crud.md](vue2-crud.md)。

## 1. 前置

- Vue **3.4+**（`defineModel` 与 `v-model:xxx` 必需）、`<script setup lang="ts">`。
- Element Plus 2.x；图标用 `@element-plus/icons-vue` 的**组件**，不是类名字符串。
- 项目用 Vite；`v-loading` 由全局注册的 Element Plus 提供。
- 不引入 `process.env`、不使用 Element UI 2 的 `slot-scope`、`::v-deep`、`size="mini"`。

## 2. 文件清单

```text
src/components/crud/
├── crud.vue            # 容器：筛选条 + 表格槽 + 分页
├── table.vue           # schema → el-table-column
├── table-filters.vue   # schema → 输入框 / 下拉
├── pagination.vue      # el-pagination 包装
├── form.vue            # 分区 + 字段 schema → el-form
├── column-sizing.ts        # 纯函数：列宽、固定列、操作列宽
├── action-button-icons.ts  # 操作按钮默认图标 + resolveActionButtonIcon
├── types.ts                # 全部 schema 与 props
└── index.ts            # re-export（export type * from './types'）
```

没有 `mobile-table.vue`，没有 `useMediaQuery`，没有 `@include when-mobile`。移动端适配是另一个任务。

## 3. 关键实现

### 3.1 `crud.vue`

```vue
<script setup lang="ts">
import TableFilters from './table-filters.vue'
import type { FilterItem } from './types'

withDefaults(defineProps<{
  filterItems?: FilterItem[]
  pagination?: { page: number; pageSize: number; total: number; layout?: string; pageSizes?: number[]
    onPageChange?: (page: number) => void; onSizeChange?: (size: number) => void }
}>(), { filterItems: () => [] })          // 对象 / 数组默认值必须给工厂函数

const filterValues = defineModel<Record<string, any>>('filterValues', { default: () => ({}) })
const emit = defineEmits<{ filterChange: [key: string, value: any] }>()
</script>
```

模板三段：`.crud-filters`（`v-if` 有筛选项或有插槽）→ `.crud-table`（`<slot name="table" />`）→ `.crud-pagination`（`<el-pagination v-model:current-page="pagination.page" …>`）。

`el-pagination` 直接 `v-model:current-page` 绑到 `props.pagination.page` 上——props 对象里的字段是浅只读的，但对**对象属性**赋值仍生效，页面传进来的就是 `reactive` 的查询状态，改完由页面自己的 `onPageChange` 触发加载。不要为分页再造一层本地副本。

### 3.2 `table.vue`

列用 `v-for` + `v-else-if` 按 `type` 分支直出 `el-table-column`，**不需要 remount**：Vue 3 的 `v-for` 会正确增删列。这是与 Vue 2 最大的差别。

```vue
<el-table :data="data" :height="resolvedHeight" :row-key="rowKey" v-loading="loading"
  :border="border" :stripe="stripe" :highlight-current-row="highlightCurrentRow"
  @row-click="onRowClick" @selection-change="onSelectionChange">
  <template #empty><span>暂无数据</span></template>
  <template v-for="col in columns" :key="colKey(col)">
    <el-table-column v-if="col.type === 'selection'" type="selection" fixed="left" reserve-selection width="50" />
    <el-table-column v-else-if="col.type === 'index'" type="index" :index="i => (col.startIndex ?? 1) + i" … />
    <el-table-column v-else-if="col.type === 'custom'" :prop="col.prop" …>
      <template #default="scope">
        <slot :name="col.slotName ?? `col-${col.prop}`" v-bind="scope" />
      </template>
    </el-table-column>
    <el-table-column v-else-if="col.type === 'action'" :label="col.label ?? '操作'" :width="actionColumnWidth(col)">
      <template #default="{ row, $index }">
        <el-button v-for="btn in visibleButtons(col, row)" :key="btn.label" link :type="btn.type"
          :icon="btn.icon" @click.stop="btn.onClick(row, $index)">{{ btn.label }}</el-button>
        <el-dropdown v-if="hasMore(col, row)">…</el-dropdown>
      </template>
    </el-table-column>
    …
  </template>
</el-table>
```

要点：

- `colKey(col)` 给控制列返回固定 key（`_selection` / `_index` / `_action` / `_expand`），其余用 `prop`，避免 `v-for` 复用错列。
- 操作按钮渲染成 `el-button link`（Element Plus 没有 `type="text"`），`@click.stop` 阻断行点击。
- 图标：`resolveActionButtonIcon(btn)`——页面可省略 `icon`，「查看 / 编辑 / 删除」等按 `label` 自动匹配（见 `action-button-icons.ts` 的 `DEFAULT_ACTION_BUTTON_ICONS`）；自定义传 `icon: SomeIcon`；纯文字传 `icon: false`。
- 高度链：`const resolvedHeight = computed(() => …)`。无 `expand` 列时用 `ResizeObserver` 测得的高度数值；有 `expand` 列时用 `'100%'`；`maxHeight` 优先。空表要撑满时把 `emptyFill` 置真并让 `body-wrapper` 吃掉剩余高度。
- `ResizeObserver` 首次测量要等 `nextTick` + 双 `requestAnimationFrame`：元素自身挂载早于 `el-table` 的列布局，过早测量会读到塌缩中的高度并被固定下来。`onBeforeUnmount` 里 `disconnect()`。
- 对外暴露：`defineExpose({ getTableRef, clearSelection, toggleRowSelection, sort })`，页面通过 `ref` 调。

### 3.3 `table-filters.vue`

```ts
const filterValues = defineModel<Record<string, any>>('filterValues', { default: () => ({}) })

function onChange(key: string, val: any) {
  filterValues.value[key] = val      // 就地赋值，不要整体替换
  emit('change', key, val)
}
```

**就地改属性而不是 `filterValues.value = { ...filterValues.value, [key]: val }`**：父组件多以 `v-model:filter-values` 绑 `reactive` 对象，整体替换会让父级变量指向另一个普通对象，父级 `computed` / `watch` 断链。

输入框用项目的防抖输入组件（或 `debounceMs` 自行实现），`select` 不需要防抖。

### 3.4 `form.vue`

字段渲染按 `type` 分支；值统一走 `:model-value` + `@update:model-value`：

```ts
function onFieldChange(field: FormField, val: any) {
  emit('update:modelValue', { ...props.modelValue, [field.prop]: val })   // 每次发新对象
  field.onChange?.(val, { ...props.modelValue, [field.prop]: val })
}
```

- 校验自己实现（`validate()` + `fieldErrors` 传给 `el-form-item` 的 `:error`），因为 schema 里的 `rules` 是普通对象、不是 `el-form` 需要的 `FormItemRule`。`validate()` 返回 `Promise<boolean>`，页面 `await` 后决定是否提交。
- `defineExpose({ validate, getModel, clearErrors })`。
- 折叠分区用 `reactive` 的 `collapsedMap`（index → boolean），`sections` 变化时 `watch(..., { immediate: true })` 重置，不要用 `ref` 数组下标。

### 3.5 `pagination.vue`

用本地 `ref` 承接 `el-pagination` 的双向绑定，`watch` `props.config.page` / `pageSize` 回同步；`@current-change` 里先 `emit('update:page')` 再调 `config.onPageChange`。独立使用时可以受控，被 `Crud` 内联时可直接绑 props（见 3.1），两种都行，同一个项目只用一种。

## 4. 与 Vue 2 实现的差异

| 事项 | Vue 3（本文） | Vue 2（[vue2-crud.md](vue2-crud.md)） |
|------|---------------|----------------------------------------|
| 组件写法 | `<script setup>` + `withDefaults` | `Vue.extend` + `props` 对象 |
| 双向绑定 | `v-model:filter-values` / `defineModel` | `:value` + `@input` |
| 列渲染 | `v-for` 直出，增删列自动生效 | 需 `table-column.vue` 子组件 + 整表 `:key` remount |
| 槽透传 | 显式 `<slot :name v-bind="scope">` | `$scopedSlots` 遍历 + `slot-scope` |
| 按钮样式 | `link` | `type="text"` |
| 图标 | 组件 | `el-icon-xxx` 类名字符串 |
| 日期格式 | `YYYY-MM-DD` | `yyyy-MM-dd` |
| 标签尺寸 | `size="small"` | `size="mini"` |
| 深层样式 | `:deep()` | `::v-deep` |
| 筛选值更新 | 就地改属性 | 抛新对象，父级整体替换 |

## 5. 页面示例

```vue
<template>
  <div class="order-page">
    <Crud v-model:filter-values="filters" :filter-items="filterItems" :pagination="pagination">
      <template #filters-actions>
        <el-button type="primary" @click="openCreate">新建订单</el-button>
      </template>
      <template #table>
        <Table :columns="columns" :data="rows" row-key="id" :loading="loading" />
      </template>
    </Crud>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑订单' : '新建订单'" width="640px">
      <Form ref="formRef" v-model="formModel" :sections="formSections" />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { createOrder, deleteOrder, getOrderList, patchOrder } from '@/api/order'
import { Crud, Form, Table } from '@/components/crud'
import type { ColumnSchema, FilterItem, FormSection } from '@/components/crud'

const filters = reactive<{ keyword: string; status: string }>({ keyword: '', status: '' })
const page = reactive({ page: 1, pageSize: 20, total: 0 })
const rows = ref<OrderRow[]>([])
const loading = ref(false)

const filterItems: FilterItem[] = [
  { key: 'keyword', type: 'input', placeholder: '订单号 / 客户', width: '220px' },
  { key: 'status', type: 'select', placeholder: '状态', options: STATUS_OPTIONS },
]

const columns = computed<ColumnSchema[]>(() => [
  { type: 'index', label: '序号', startIndex: (page.page - 1) * page.pageSize + 1 },
  { type: 'text', prop: 'orderNo', label: '订单号', minWidth: 140 },
  { type: 'tag', prop: 'status', label: '状态', width: 100, tagMap: { DONE: 'success', DOING: 'warning' } },
  { type: 'date', prop: 'createdAt', label: '创建时间' },
  {
    type: 'action', label: '操作',
    buttons: [
      // 无需写 icon：「查看」「编辑」「删除」等 label 由 Table 自动匹配图标
      { label: '编辑', onClick: (row) => openEdit(row as OrderRow) },
      { label: '删除', type: 'danger', onClick: (row) => void removeOrder(row as OrderRow) },
    ],
  },
])

const pagination = computed(() => ({
  ...page,
  onPageChange: (p: number) => { page.page = p; void load() },
  onSizeChange: (s: number) => { page.pageSize = s; page.page = 1; void load() },
}))

async function load() {
  loading.value = true
  try {
    const data = await getOrderList({ ...filters, page: page.page, pageSize: page.pageSize })
    rows.value = data.list
    page.total = data.total
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<style scoped>
.order-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
</style>
```

页面根节点必须有确定高度，否则表格区算不出剩余空间（见 [crud.md](crud.md) §8）。

### 3.5 列内状态开关

```vue
<Table :columns="columns" :data="rows">
  <template #col-enabled="{ row }">
    <el-switch
      :model-value="row.enabled"
      inline-prompt
      active-text="启"
      inactive-text="停"
      :loading="togglingId === row.id"
      @change="(v) => void onEnabledChange(row, Boolean(v))"
    />
  </template>
</Table>
```

`columns` 里：`{ type: 'custom', prop: 'enabled', label: '状态', width: 100, align: 'center' }`。

### 3.6 列表编辑抽屉

```vue
<el-drawer v-model="drawerVisible" title="编辑" direction="rtl" size="480px"
  class="list-form-drawer" destroy-on-close>
  <div class="list-form-drawer__body">
    <Form ref="formRef" v-model="formModel" :sections="sections"
      label-width="112px" label-position="right" />
  </div>
  <div class="list-form-drawer__footer">
    <el-button @click="drawerVisible = false">取消</el-button>
    <el-button type="primary" :loading="saving" @click="submit">确定</el-button>
  </div>
</el-drawer>
```

项目内 `@/components/crud/list-form-drawer.scss`（或拷 `knowledge/crud/list-form-drawer.scss`）。完整片段见 `knowledge/crud/vue3/list-form-drawer.snippet.vue`。

`form.vue` 已包一层 `el-form`：`validate()` 走 Element Plus；规则未写 `trigger` 时默认 `blur`。

## 6. 易错点

| 现象 | 原因 |
|------|------|
| 筛选变了但列表不动 | 在 `TableFilters` 里整体替换了 `filterValues` |
| 表格滚动条落在可视区外 | 父级某一层缺 `height: 100%` / `min-height: 0`；或 `ResizeObserver` 测得 0 |
| 展开行内容高度塌成十几 px | 含 `expand` 列时用了数值高度，应改用 `'100%'` |
| 固定列错位 | 操作列宽随数据变化后没有 `nextTick(() => tableRef.doLayout())` |
| 空表不居中 | 没设 `emptyFill`，或 `body-wrapper` 没有 `flex: 1` |
| `withDefaults` 报数组类型错 | 数组 / 对象默认值没写工厂函数 |
| 表单输入不生效 | 直接改 `props.modelValue[prop]`，应 `emit('update:modelValue', 新对象)` |

## 7. 验证

在应用包目录，用该包已选用的包管理器执行 `package.json` 中已有的脚本（常见 `lint`、`build`、`test`）。

- 单测：`src/__test__/components/crud/column-sizing.test.ts` 覆盖列宽 / 固定列 / 按钮折叠切片；`table.test.ts` 用 `@vue/test-utils` 断言「无数据时渲染暂无数据」「点击操作按钮抛出对应行」。
- 手测：改筛选后回第 1 页；切换每页条数；空列表；接口失败（提示来自 Element Plus 适配器，页面不重复弹窗）。

可直接拷的参考实现：`knowledge/crud/vue3/`（含 `example-page.vue`），复制到 `src/components/crud/` 后改 `mockQuery` 与 `OrderRow` 即可。
