<template>
  <!-- 复制到 src/views/orders/index.vue（目录名按业务改）。
       这一页就是「列表页」的标准写法：筛选 + 表格 + 分页 + 新建/编辑弹窗，
       页面里不出现任何列宽、对齐、按钮排布的手工样式。
       Vue 2 模板必须单根，所以最外层套一个 div，弹窗也放在里面。 -->
  <div class="order-page">
    <Crud
      :filter-items="filterItems"
      :value="filters"
      :pagination="pagination"
      @input="onFiltersChange"
    >
      <template #filters-actions>
        <el-button type="primary" size="small" @click="openCreate">新建工单</el-button>
      </template>

      <template #table>
        <!--
          Vue 2 没有 v-model:selection，选中行通过 @selection-change 拿到。
          :key 已由 Table 内部按列结构生成，页面不要再传 key。
        -->
        <Table
          :columns="columns"
          :data="rows"
          :loading="loading"
          row-key="id"
          @selection-change="onSelectionChange"
        >
          <!-- custom 列：插槽名默认 col-{prop} -->
          <template #col-owner="{ row }">
            <el-tag size="small" type="info">{{ row.owner }}</el-tag>
          </template>
        </Table>
      </template>
    </Crud>

    <el-dialog
      :visible.sync="dialogVisible"
      :title="editingId ? '编辑工单' : '新建工单'"
      width="680px"
      :close-on-click-modal="false"
      @closed="onDialogClosed"
    >
      <Form
        ref="form"
        :value="formModel"
        :sections="formSections"
        label-width="88px"
        @input="formModel = $event"
      />
      <template #footer>
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { Form, Table, Crud } from '@/components/crud';
import type { ColumnSchema, FilterItem, FormSection, PaginationConfig } from '@/components/crud';

interface OrderRow {
  id: number;
  code: string;
  title: string;
  owner: string;
  status: 'draft' | 'running' | 'done';
  amount: number;
  createdAt: string;
  remark: string;
}

export default Vue.extend({
  name: 'OrderListPage',
  components: { Crud, Table, Form },
  data() {
    return {
      loading: false,
      saving: false,
      rows: [] as OrderRow[],
      selection: [] as OrderRow[],
      /** 筛选值：必须是对象，Crud 收到新对象后整体替换 */
      filters: { keyword: '', status: '' } as Record<string, any>,

      // 分页配置就是 data 里的一个普通对象，组件直接改它的 page / pageSize
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        // page / pageSize 已被组件写入，这里只负责重查
        onPageChange: () => this.load(),
        onSizeChange: () => {
          this.pagination.page = 1;
          this.load();
        },
      } as PaginationConfig,

      filterItems: [
        { key: 'keyword', placeholder: '单号 / 标题', width: '200px', debounceMs: 300 },
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
      ] as FilterItem[],

      columns: [
        { type: 'selection' },
        { type: 'index', label: '序号' },
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
        // Element UI 2 的日期格式是 yyyy-MM-dd HH:mm（小写），不是 dayjs 的 YYYY-MM-DD
        { type: 'date', prop: 'createdAt', label: '创建时间', format: 'yyyy-MM-dd HH:mm' },
        {
          type: 'action',
          label: '操作',
          maxVisible: 2,
          buttons: [
            { label: '编辑', onClick: (row: OrderRow) => this.openEdit(row) },
            {
              label: '完成',
              hidden: (row: OrderRow) => row.status === 'done',
              onClick: (row: OrderRow) => this.finish(row),
            },
            { label: '删除', type: 'danger', onClick: (row: OrderRow) => this.remove(row) },
          ],
        },
      ] as ColumnSchema[],

      // ==================== 弹窗 ====================
      dialogVisible: false,
      editingId: null as number | null,
      formModel: {} as Record<string, any>,

      formSections: [
        {
          title: '基本信息',
          cols: 2,
          boxed: true,
          fields: [
            {
              type: 'input',
              prop: 'code',
              label: '单号',
              rules: { required: true, message: '请填写单号' },
            },
            {
              type: 'input',
              prop: 'title',
              label: '标题',
              rules: { required: true, message: '请填写标题' },
            },
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
            {
              type: 'textarea',
              prop: 'remark',
              label: '说明',
              rows: 3,
              maxlength: 200,
              showWordLimit: true,
            },
          ],
        },
      ] as FormSection[],
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        // TODO: 换成真实接口 → api/order.ts 里的 listOrder(params)
        const result = mockQuery({
          ...this.filters,
          page: this.pagination.page,
          pageSize: this.pagination.pageSize,
        });
        this.rows = result.list;
        this.pagination.total = result.total;
      } finally {
        this.loading = false;
      }
    },

    /** 筛选条抛出的是「新对象」，这里整体替换后回到第一页 */
    onFiltersChange(next: Record<string, any>) {
      this.filters = next;
      this.pagination.page = 1;
      this.load();
    },

    onSelectionChange(rows: OrderRow[]) {
      this.selection = rows;
    },

    // ==================== 弹窗 ====================

    openCreate() {
      this.editingId = null;
      this.formModel = { code: '', title: '', owner: '', amount: 0, dueDate: '', remark: '' };
      this.dialogVisible = true;
    },

    openEdit(row: OrderRow) {
      this.editingId = row.id;
      this.formModel = { ...row };
      this.dialogVisible = true;
    },

    async submit() {
      const form = this.$refs.form as { validate: () => Promise<boolean> } | undefined;
      const valid = await form?.validate();
      if (!valid) return;
      this.saving = true;
      try {
        // TODO: createOrder / updateOrder
        this.$message.success(this.editingId ? '已保存' : '已创建');
        this.dialogVisible = false;
        this.load();
      } finally {
        this.saving = false;
      }
    },

    onDialogClosed() {
      const form = this.$refs.form as { clearErrors: () => void } | undefined;
      form?.clearErrors();
      this.formModel = {};
      this.editingId = null;
    },

    finish(row: OrderRow) {
      this.$confirm(`确认把「${row.title}」标记为已完成？`, '提示', { type: 'warning' })
        .then(() => {
          row.status = 'done';
          this.$message.success('已完成');
        })
        .catch(() => undefined);
    },

    remove(row: OrderRow) {
      this.$confirm(`确认删除「${row.title}」？`, '提示', { type: 'warning' })
        .then(() => {
          this.$message.success('已删除');
          this.load();
        })
        .catch(() => undefined);
    },
  },
});

// ==================== 假数据（接真实接口后整块删掉）====================

function mockQuery(params: Record<string, any>): { list: OrderRow[]; total: number } {
  const all: OrderRow[] = Array.from({ length: 46 }, (_, i) => ({
    id: i + 1,
    code: `WO-2026-${String(i + 1).padStart(3, '0')}`,
    title: `工单标题 ${i + 1}`,
    owner: i % 2 ? '张三' : '李四',
    status: (['draft', 'running', 'done'] as const)[i % 3],
    amount: (i + 1) * 1200,
    createdAt: `${2016 + (i % 3)}-11-${String(1 + (i % 28)).padStart(2, '0')} 09:30:00`,
    remark: '',
  }));
  const filtered = all.filter((r) => {
    const kw = String(params.keyword ?? '').trim();
    if (kw && !r.code.includes(kw) && !r.title.includes(kw)) return false;
    if (params.status && r.status !== params.status) return false;
    return true;
  });
  const start = (params.page - 1) * params.pageSize;
  return { list: filtered.slice(start, start + params.pageSize), total: filtered.length };
}
</script>

<style scoped>
/* 撑满路由出口；Crud 自己 height:100%，外层给个确定高度的 flex 容器即可 */
.order-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.order-page ::v-deep .crud-root {
  flex: 1;
  min-height: 0;
}
</style>
