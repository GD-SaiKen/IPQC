<template>
  <div class="table-wrapper" :class="{ 'is-empty': !data.length && !loading }">
    <!--
      :key 用于「列结构变化时整表重挂载」：Element UI 2 的 el-table-column
      只在 mounted 时向父表注册列，v-for 减少列时旧列不会被移除（会残留幻影列），
      换 key 强制重建是最省事且稳定的解法。
      v-on="$listeners"：把 selection-change / sort-change / expand-change 等
      直接透传给内层 el-table，页面不必再拿 ref 手动绑定。
    -->
    <el-table
      :key="tableColumnKey"
      ref="elTable"
      :data="data"
      :height="fillParent ? height : undefined"
      :size="size"
      :stripe="stripe"
      :border="border"
      :row-key="rowKey"
      :row-class-name="rowClassName"
      :highlight-current-row="highlightCurrentRow"
      v-loading="loading"
      v-on="$listeners"
      style="width: 100%"
      @row-click="onRowClick"
    >
      <crud-table-column v-for="col in resolvedColumns" :key="col.key" :col="col">
        <template v-for="slotName in Object.keys($scopedSlots)" :slot="slotName" slot-scope="slotData">
          <slot :name="slotName" v-bind="slotData" />
        </template>
      </crud-table-column>
      <div slot="empty" class="table-empty-text">暂无数据</div>
    </el-table>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { resolveColFixed, resolveColSizing } from './column-sizing';
import CrudTableColumn, { type ResolvedTableColumn } from './table-column.vue';
import type { ColumnSchema } from './types';

export default Vue.extend({
  name: 'CrudTable',
  components: { CrudTableColumn },
  props: {
    /** 列配置；表格完全由 schema 驱动，页面不写死列 */
    columns: { type: Array as () => ColumnSchema[], default: () => [] },
    data: { type: Array as () => Record<string, any>[], default: () => [] },
    height: { type: [String, Number], default: '100%' },
    /** 为 false 时表格随内容增高，不占满父级 flex 高度（用于页面内嵌列表） */
    fillParent: { type: Boolean, default: true },
    size: { type: String, default: 'small' },
    stripe: { type: Boolean, default: true },
    border: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    rowKey: { type: String, default: '' },
    highlightCurrentRow: { type: Boolean, default: false },
    rowClassName: {
      type: Function as unknown as () => (row: Record<string, any>, index: number) => string,
      default: null,
    },
    onRowClick: {
      type: Function as unknown as () => (row: Record<string, any>) => void,
      default: null,
    },
  },
  watch: {
    data() {
      this.scheduleLayout();
    },
    height() {
      this.scheduleLayout();
    },
    columns: {
      deep: true,
      handler() {
        this.scheduleLayout();
      },
    },
  },
  mounted() {
    this.scheduleLayout();
    // Element UI 2 没有 ResizeObserver 方案，列宽自适应靠窗口 resize + doLayout
    window.addEventListener('resize', this.scheduleLayout);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.scheduleLayout);
  },
  computed: {
    resolvedColumns(): ResolvedTableColumn[] {
      return this.columns.map((schema, index) => this.resolveColumn(schema, index));
    },
    /** 列结构签名：作为 el-table 的 key，列增删时整表重挂载 */
    tableColumnKey(): string {
      return this.resolvedColumns.map((col) => col.key).join('\0');
    },
  },
  methods: {
    resolveColumn(schema: ColumnSchema, index: number): ResolvedTableColumn {
      if (schema.type === 'group') {
        return {
          key: `group-${schema.label || index}`,
          schema,
          children: schema.children.map((child, childIndex) =>
            this.resolveColumn(child, childIndex)
          ),
        };
      }
      const sizing = resolveColSizing(schema);
      return {
        key: `${schema.type}-${schema.prop || schema.label || index}`,
        schema,
        width: sizing.width,
        minWidth: sizing.minWidth,
        fixed: resolveColFixed(schema),
        className: sizing.className,
      };
    },
    scheduleLayout() {
      this.$nextTick(() => {
        const table = this.$refs.elTable as { doLayout?: () => void } | undefined;
        table?.doLayout?.();
      });
    },
  },
});
</script>

<style lang="scss" scoped>
.table-wrapper {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.table-wrapper ::v-deep .el-table {
  color: #303133;
  font-size: 14px;
  text-align: center;
}

.table-wrapper ::v-deep .el-table td {
  vertical-align: middle;
}

.table-wrapper ::v-deep .el-table .cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-wrapper ::v-deep .el-table th {
  color: #606266;
  background: #fff;
  font-weight: 600;
}

.table-wrapper ::v-deep .el-table thead.is-group {
  th {
    background: #fff;
  }

  tr:first-child th .cell,
  tr:nth-child(2) th .cell {
    white-space: nowrap;
    line-height: 1.25;
    font-size: 12px;
    padding: 4px 6px;
  }
}

.table-wrapper ::v-deep .th-header-tip {
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
}

.table-wrapper ::v-deep .th-multiline {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  white-space: normal;
  word-break: break-all;
}

.table-wrapper ::v-deep .el-table td,
.table-wrapper ::v-deep .el-table th.is-leaf {
  border-bottom-color: #ebeef5;
}

.table-wrapper ::v-deep .el-table__body tr:hover > td {
  background: #f7f9fc;
}

.table-wrapper ::v-deep .el-button--text {
  padding: 0 4px;
  color: #409eff;
}

.table-wrapper ::v-deep .el-button--text [class*='el-icon-'] {
  margin-right: 3px;
}

.table-wrapper ::v-deep .action-btn--primary {
  color: #409eff;
}

.table-wrapper ::v-deep .action-btn--danger {
  color: #f56c6c;
}

.table-wrapper ::v-deep .action-btn--warning {
  color: #e6a23c;
}

.table-wrapper ::v-deep .action-btn--success {
  color: #67c23a;
}

.table-wrapper ::v-deep .action-btn--info {
  color: #909399;
}

/* 操作列允许换行，否则按钮会被 .cell 的 nowrap 裁掉 */
.table-wrapper ::v-deep .el-table__body td .crud-action-cell {
  white-space: normal;
}

.table-empty-text,
.text-muted {
  color: #909399;
  font-size: 12px;
}

.table-wrapper ::v-deep .cell-link {
  color: #409eff;
  cursor: pointer;
}

.table-wrapper ::v-deep .cell-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
