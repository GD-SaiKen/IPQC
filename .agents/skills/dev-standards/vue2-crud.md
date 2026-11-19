# Vue 2 + Element UI 2 — CRUD 组件落地

契约（组件分工、类型、列宽规则、页面六件事）见 [crud.md](crud.md)；本文只写 Vue 2 的实现方式与页面写法。Vue 3 见 [vue3-crud.md](vue3-crud.md)。

## 1. 前置

- Vue **2.6 / 2.7** + `<script lang="ts">`，**Options API**（`Vue.extend`）；`<script setup>`、`defineModel`、Teleport 一律不可用。
- Element UI 2（`2.15.x`）；构建目标含 **IE11**（Babel → ES5，`core-js`、`regenerator-runtime`）。
- 不用 `:deep()`（用 `::v-deep`）、不用 `size="small"` 的 Plus 语义按钮（文字按钮是 `type="text"`）、图标是**类名字符串** `el-icon-edit`。
- 日期格式占位符是 **`yyyy-MM-dd`**，不是 Element Plus 的 `YYYY-MM-DD`。

## 2. 文件清单

```text
src/components/crud/
├── crud.vue             # 容器：筛选条 + 页头槽 + 表格槽 + 分页
├── table.vue            # 列解析 + 整表 remount key + doLayout 调度
├── table-column.vue     # 单列渲染（Element UI 动态列必需）
├── table-header-label.vue  # 可选：多行表头 / 表头提示徽标
├── table-filters.vue    # schema → 输入框 / 下拉 / 日期区间
├── pagination.vue       # el-pagination 包装（受控）
├── form.vue             # 分区 + 字段 schema → el-form
├── column-sizing.ts     # 纯函数：列宽、固定列
├── types.ts             # 全部 schema 与 props
└── index.ts             # export * from './types'
```

比 Vue 3 多 `table-column.vue`（原因见 §3.2），没有 `mobile-table.vue`、没有 `@media (max-width: …)` 的移动端分支。

## 3. 关键实现

### 3.1 `crud.vue`

```ts
export default Vue.extend({
  name: 'Crud',
  props: {
    filterItems: { type: Array as PropType<FilterItem[]>, default: () => [] },
    value: { type: Object, default: () => ({}) },        // 筛选值：:value + @input
    pagination: { type: Object as () => PaginationConfig, default: null },
    /** 可选：筛选项多时折叠，收起后仅保留 pinned 项 */
    filtersCollapsible: { type: Boolean, default: false },
  },
  computed: {
    visibleFilterItems(): FilterItem[] {
      if (!this.filtersCollapsible || this.filterPanelOpen) return this.filterItems
      return this.filterItems.filter((item) => !!item.pinned)
    },
  },
})
```

模板把 `<TableFilters :items :value @input="$emit('input', $event)" />`、`<slot name="header" />`、`<slot name="table" />`、`<Pagination :config="pagination" />` 依次排开。`Pagination` 是**受控**的：不维护本地页码，全部由 `config.page` / `config.pageSize` 决定，回调里改父级状态。

### 3.2 `table.vue` + `table-column.vue`

Element UI 2 的动态列**不会移除旧的 `el-table-column`**：`columns` 变短或换一组时，旧列仍留在 DOM 里。两个措施必须同时有：

```ts
computed: {
  resolvedColumns(): ResolvedTableColumn[] {
    return this.columns.map((schema, index) => this.resolveColumn(schema, index))
  },
  /** 列清单变化 → 整表 remount，Element UI 才会重建表头 */
  tableColumnKey(): string {
    return this.resolvedColumns.map((col) => col.key).join('\0')
  },
},
```

```html
<el-table :key="tableColumnKey" ref="elTable" :data="data" :height="fillParent ? height : undefined" …>
  <crud-table-column v-for="col in resolvedColumns" :key="col.key" :col="col">
    <template v-for="slotName in Object.keys($scopedSlots)" :slot="slotName" slot-scope="slotData">
      <slot :name="slotName" v-bind="slotData" />
    </template>
  </crud-table-column>
  <div slot="empty" class="table-empty-text">暂无数据</div>
</el-table>
```

`table-column.vue` 一个组件里用 `v-if / v-else-if` 分支渲染 `el-table-column`（同一时刻只渲染一个根节点，Vue 2 允许），按 `type` 区分：`index` / `group`（多级表头，仅此栈需要）/ 其余。单元格仍在 `<template slot-scope="scope">` 里按 `tag` → `custom` → `action` → `text(可点)` → 兜底顺序分支。

`action` 列用 `el-button type="text" size="small" :icon="btn.icon"`，超出 `maxVisible` 的按钮放进 `el-dropdown`，用 `@command` 派发。

**布局调度**（替代 Vue 3 的 `ResizeObserver`，IE11 没有该 API）：

```ts
watch: {
  data() { this.scheduleLayout() },
  height() { this.scheduleLayout() },
  columns: { deep: true, handler() { this.scheduleLayout() } },
},
mounted() {
  this.scheduleLayout()
  window.addEventListener('resize', this.scheduleLayout)   // 箭头/绑定后的方法，注意解绑一致
},
beforeDestroy() {
  window.removeEventListener('resize', this.scheduleLayout)
},
methods: {
  scheduleLayout() {
    this.$nextTick(() => {
      (this.$refs.elTable as { doLayout?: () => void } | undefined)?.doLayout?.()
    })
  },
},
```

高度靠 CSS 百分比（`height="100%"`）传递，不测像素：所以**父级每一层都要有确定高度**，页面根节点 `display:flex; flex-direction:column; height:100%; min-height:0`。

### 3.3 `table-filters.vue`

```ts
methods: {
  onChange(key: string, value: any) {
    this.$emit('input', { ...this.value, [key]: value })   // 抛新对象，父级整体替换
    this.$emit('change', key, value)
  },
}
```

与 Vue 3 **相反**：Vue 3 就地改 `filterValues` 的属性，Vue 2 抛新对象、由父级 `this.rowFilters = value` 替换。原因是 Vue 2 的 `:value` / `@input` 单向流更接近「受控组件」，整体替换才能触发父级 `computed` 重算。同一项目里不要两种混用。

- 文本输入用 `@input`，`select` 用 `@change`（Element UI 2 的下拉在 `input` 上会连续触发）。
- 需要输入防抖时（服务端筛选），在 `onChange` 外包 250–300ms 定时器并清掉上一次；`select` / 日期不要防抖。`debounceMs` 缺省视为 0（立即生效），避免用户以为输入丢了。
- `daterange` 用 `value-format="yyyy-MM-dd"`，值形如 `['2026-01-01', '2026-01-31']`，传后端前由页面拆成两个字段。

### 3.4 `form.vue`

```ts
export default Vue.extend({
  model: { prop: 'modelValue', event: 'input' },   // 让 v-model 落到 modelValue 上
  props: {
    modelValue: { type: Object as PropType<Record<string, any>>, default: undefined },
    value: { type: Object as PropType<Record<string, any>>, default: undefined },  // 兼容 :value
    sections: { type: Array as () => FormSection[], default: () => [] },
  },
  computed: {
    boundModel(): Record<string, any> {
      return this.modelValue != null ? this.modelValue : (this.value as Record<string, any>) ?? {}
    },
  },
  methods: {
    onFieldChange(field: FormField, val: any) {
      const model = { ...this.boundModel, [field.prop]: val }
      this.$emit('input', model)                 // 双向同步
      this.$emit('update:modelValue', model)     // 兼容 .sync / v-model 写法
      field.onChange?.(val, model)
    },
  },
})
```

- `data()` 里 `collapsedMap` / `fieldErrors` 是普通对象，动态加 key 必须 `this.$set(obj, key, val)`，否则视图不更新。
- 校验自己实现（`validate()` 返回 `Promise<boolean>`），`fieldErrors[prop]` 传给 `el-form-item` 的 `:error`。
- `el-form-item` 的 label 走 `slot="label"`，提示图标用 `el-tooltip` + `el-icon-question`。
- 字段控件用 `:value` + `@input`（`switch` / `number` / `checkbox-group` 同理），不要 `v-model` 直绑 prop——Vue 2 会对 prop 赋值告警。
- 日期占位符：`format="yyyy-MM-dd"`、`value-format="yyyy-MM-dd"`。

### 3.5 `pagination.vue`

完全受控：`:current-page="config.page || 1"`、`:page-size="config.pageSize || 20"`，`@current-change` / `@size-change` 里先调 `config.onXxx` 再 `$emit('update:xxx')`。父级把分页配置放 `computed` 返回（数据变了会自动重建），不要在 data 里存一份可变对象。

## 4. 与 Vue 3 实现的差异

| 事项 | Vue 2（本文） | Vue 3（[vue3-crud.md](vue3-crud.md)） |
|------|---------------|----------------------------------------|
| 组件写法 | `Vue.extend` + `props` 对象 | `<script setup>` + `withDefaults` |
| 筛选值绑定 | `:value` + `@input`，抛**新对象** | `v-model:filter-values`，**就地改属性** |
| 列渲染 | `table-column.vue` + 整表 `:key` remount | `v-for` 直出，自动增删 |
| 多级表头 | 支持（`type='group'` + `children`） | 按需再实现 |
| 高度测量 | 无 `ResizeObserver`，靠 `height="100%"` + `doLayout()` | `ResizeObserver` 测像素 + 双 rAF |
| 槽透传 | `$scopedSlots` + `slot-scope` | `<slot v-bind="scope">` |
| 按钮 | `type="text"` | `link` |
| 图标 | 类名字符串 | 组件 |
| 日期格式 | `yyyy-MM-dd` | `YYYY-MM-DD` |
| 标签尺寸 | `size="mini"` | `size="small"` |
| 深层样式 | `::v-deep` | `:deep()` |

## 5. 页面示例

```vue
<template>
  <div class="order-page">
    <Crud
      :filter-items="filterItems"
      :value="filters"
      :pagination="pagination"
      @input="onFilterInput"
    >
      <template #filters-actions>
        <el-button size="small" type="primary" @click="openCreate">新建订单</el-button>
      </template>
      <template #table>
        <Table :columns="columns" :data="rows" row-key="id" :loading="loading" />
      </template>
    </Crud>

    <el-dialog :visible.sync="dialogVisible" :title="editingId ? '编辑订单' : '新建订单'" width="640px">
      <Form ref="formRef" v-model="formModel" :sections="formSections" />
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="submit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { createOrder, deleteOrder, getOrderList, patchOrder } from '@/api/order';
import { Crud, Form, Table } from '@/components/crud';
import type { ColumnSchema, FilterItem, FormSection } from '@/components/crud';

interface OrderFilters { keyword: string; status: string; }

function emptyFilters(): OrderFilters {
  return { keyword: '', status: '' };
}

export default Vue.extend({
  name: 'OrderList',
  components: { Crud, Form, Table },
  data() {
    return {
      loading: false,
      rows: [] as OrderRow[],
      filters: emptyFilters(),
      page: 1,
      pageSize: 20,
      total: 0,
      dialogVisible: false,
      saving: false,
      editingId: null as number | null,
      formModel: {} as Record<string, any>,
    };
  },
  computed: {
    filterItems(): FilterItem[] {
      return [
        { key: 'keyword', type: 'input', placeholder: '订单号 / 客户', width: '220px' },
        { key: 'status', type: 'select', placeholder: '状态', options: STATUS_OPTIONS },
      ];
    },
    columns(): ColumnSchema[] {
      const startIndex = (this.page - 1) * this.pageSize + 1;
      return [
        { type: 'index', label: '序号', startIndex },
        { type: 'text', prop: 'orderNo', label: '订单号', minWidth: 140 },
        { type: 'tag', prop: 'status', label: '状态', width: 100, tagMap: { DONE: 'success', DOING: 'warning' } },
        { type: 'date', prop: 'createdAt', label: '创建时间' },
        {
          type: 'action',
          label: '操作',
          buttons: [
            { label: '编辑', icon: 'el-icon-edit', onClick: (row) => this.openEdit(row as OrderRow) },
            { label: '删除', icon: 'el-icon-delete', type: 'danger', onClick: (row) => this.remove(row as OrderRow) },
          ],
        },
      ];
    },
    // 分页配置随 state 重建，回调里改 data
    pagination() {
      return {
        page: this.page,
        pageSize: this.pageSize,
        total: this.total,
        onPageChange: (page: number) => { this.page = page; this.load(); },
        onSizeChange: (size: number) => { this.pageSize = size; this.page = 1; this.load(); },
      };
    },
    formSections(): FormSection[] { return ORDER_FORM_SECTIONS; },
  },
  created() {
    this.load();
  },
  methods: {
    load() {
      this.loading = true;
      return getOrderList({ ...this.filters, page: this.page, pageSize: this.pageSize })
        .then((data) => {
          this.rows = data.list;
          this.total = data.total;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    onFilterInput(value: OrderFilters) {
      this.filters = value;
      this.page = 1;
      this.load();
    },
    openCreate() {
      this.editingId = null;
      this.formModel = {};
      this.dialogVisible = true;
    },
  },
});
</script>

<style lang="scss" scoped>
.order-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
</style>
```

`created()` 里用普通函数、`then` / `finally` 里需要 `this` 时用箭头函数（见 [vue2.md](vue2.md) §3.5）。

## 6. IE11 与易错点

**IE11 硬约束**（这套组件踩过的）：

- 不用 `ResizeObserver`、`IntersectionObserver`、`:has()`、CSS 变量、Grid、`gap`（IE11 的 flex 忽略 `gap`，用 `margin-right` 兜底）。
- 不用 `Array.prototype.at` / `Object.fromEntries` / `structuredClone`（无 polyfill 时直接报错）。
- 表格横向滚动必须可用：`el-table` 自身滚，外层不能 `overflow: hidden` 后又不给高度。

**易错点**：

| 现象 | 原因 |
|------|------|
| 换了一组列，旧列还在 | 缺 `:key="tableColumnKey"`（Element UI 不删旧列） |
| 表头错位 / 固定列漂移 | 列宽或数据变化后没 `$nextTick` 调 `doLayout()` |
| 筛选项输入无效 | `@input` 抛新对象但父级没接 `@input`，或父级直接改了对象引用 |
| 表单某个字段视图不更新 | 用了 `this.fieldErrors[prop] = x`，应 `this.$set(...)` |
| 弹窗里 `v-model` 不生效 | 组件 `model` 选项没配，或只 emit 了 `update:modelValue` |
| 日期回填错乱 | 用了 `YYYY-MM-DD`（Element UI 2 只认 `yyyy-MM-dd`） |
| 表格撑不满 / 滚动条不见 | 父级断链：页面根节点缺 `height: 100%; min-height: 0` |

## 7. 验证

在前端包目录（常见 `web/`），用该包已选用的包管理器执行 `package.json` 中已有的脚本（常见 `lint`、`build`）。单测按该包的测试工具跑 `src/__test__/components/crud/<name>.test.ts`。

- 纯函数（`column-sizing.ts`）必须有单测；覆盖「只给 minWidth 的弹性列」「操作列按文案撑宽」「`fixed: false` 取消右固定」。
- 手测：改筛选回第 1 页、切换每页条数、空列表、接口失败。
- **发布前 IE11 复测**列表页：滚动、固定列、下拉、日期、弹窗表单。

可直接拷的参考实现：`knowledge/crud/vue2/`（含 `example-page.vue`），复制到 `src/components/crud/` 后改 `mockQuery` 与 `OrderRow` 即可。
