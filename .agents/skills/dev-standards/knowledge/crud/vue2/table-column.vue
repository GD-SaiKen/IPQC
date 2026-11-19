<template>
  <!-- 多选 -->
  <el-table-column
    v-if="col.schema.type === 'selection'"
    type="selection"
    :width="col.width"
    :fixed="col.fixed === undefined ? 'left' : col.fixed"
    :align="columnAlign(col.schema)"
    :header-align="columnHeaderAlign(col.schema)"
  />

  <!-- 序号 -->
  <el-table-column
    v-else-if="col.schema.type === 'index'"
    type="index"
    :label="col.schema.label || '序号'"
    :width="col.width"
    :min-width="col.minWidth"
    :fixed="col.fixed === undefined ? 'left' : col.fixed"
    :align="columnAlign(col.schema)"
    :header-align="columnHeaderAlign(col.schema)"
    :index="rowIndex"
  />

  <!-- 展开 -->
  <el-table-column
    v-else-if="col.schema.type === 'expand'"
    type="expand"
    :width="col.schema.width || 48"
  >
    <template slot-scope="scope">
      <slot name="expand" v-bind="scope" />
    </template>
  </el-table-column>

  <!-- 多级表头分组 -->
  <el-table-column
    v-else-if="col.schema.type === 'group'"
    :label="col.schema.label"
    :align="groupHeaderAlign"
    header-align="center"
  >
    <template v-if="useCompactHeader(col.schema)" slot="header">
      <crud-table-header-label :schema="col.schema" />
    </template>
    <template v-else-if="groupHeaderLines.length" slot="header">
      <span class="th-multiline">
        <span v-for="(line, lineIndex) in groupHeaderLines" :key="lineIndex">{{ line }}</span>
      </span>
    </template>
    <crud-table-column v-for="child in col.children" :key="child.key" :col="child">
      <template v-for="slotName in Object.keys($scopedSlots)" :slot="slotName" slot-scope="slotData">
        <slot :name="slotName" v-bind="slotData" />
      </template>
    </crud-table-column>
  </el-table-column>

  <!-- 其余叶子列 -->
  <el-table-column
    v-else
    :prop="col.schema.prop"
    :label="col.schema.label"
    :width="col.width"
    :min-width="col.minWidth"
    :fixed="col.fixed"
    :align="columnAlign(col.schema)"
    :header-align="columnHeaderAlign(col.schema)"
    :show-overflow-tooltip="overflowTooltipEnabled(col.schema)"
    :class-name="col.className"
  >
    <template v-if="useCompactHeader(col.schema)" slot="header">
      <crud-table-header-label :schema="col.schema" />
    </template>
    <template v-else-if="leafHeaderLines.length" slot="header">
      <span class="th-multiline th-multiline--sub">
        <span v-for="(line, lineIndex) in leafHeaderLines" :key="lineIndex">{{ line }}</span>
      </span>
    </template>
    <template slot-scope="scope">
      <!-- 图片 -->
      <el-image
        v-if="col.schema.type === 'image'"
        v-show="scope.row[col.schema.prop]"
        class="cell-image"
        :src="scope.row[col.schema.prop]"
        :preview-src-list="previewList(col.schema, scope.row)"
        :style="imageStyle(col.schema)"
        fit="cover"
      />

      <!-- 标签 -->
      <el-tag
        v-else-if="col.schema.type === 'tag'"
        size="mini"
        :type="tagTypeOf(col.schema, scope.row)"
      >
        {{ cellText(col.schema, scope.row) }}
      </el-tag>

      <!-- 自定义插槽 -->
      <slot
        v-else-if="col.schema.type === 'custom'"
        :name="slotNameOf(col.schema)"
        :row="scope.row"
        :index="scope.$index"
      />

      <!-- 操作列 -->
      <div v-else-if="col.schema.type === 'action'" class="crud-action-cell">
        <el-button
          v-for="button in primaryActionButtons(col.schema, scope.row)"
          :key="button.label"
          type="text"
          size="small"
          :icon="button.icon"
          :class="`action-btn--${button.type || 'primary'}`"
          @click.stop="button.onClick(scope.row, scope.$index)"
        >
          {{ button.label }}
        </el-button>
        <el-dropdown
          v-if="overflowActionButtons(col.schema, scope.row).length"
          trigger="hover"
          placement="bottom-end"
          @command="onActionOverflow($event, scope.row, scope.$index)"
        >
          <el-button type="text" size="small" class="action-btn--primary crud-action-more">
            更多<i class="el-icon-arrow-down el-icon--right" />
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item
              v-for="button in overflowActionButtons(col.schema, scope.row)"
              :key="button.label"
              :command="button"
            >
              <i v-if="button.icon" :class="[button.icon, 'crud-action-dropdown-icon']" />
              <span>{{ button.label }}</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>

      <!-- 文本（可点击） -->
      <span
        v-else-if="col.schema.type === 'text' && col.schema.onClick"
        class="cell-link cell-ellipsis"
        :title="cellText(col.schema, scope.row)"
        @click.stop="col.schema.onClick(scope.row[col.schema.prop], scope.row)"
      >
        {{ cellText(col.schema, scope.row) }}
      </span>

      <!-- 文本 -->
      <span v-else class="cell-ellipsis" :title="overflowTitle(col.schema, scope.row)">
        {{ cellText(col.schema, scope.row) }}
      </span>
    </template>
  </el-table-column>
</template>

<script lang="ts">
import Vue from 'vue';

import { formatDisplay } from './date-format';
import { isLeftAlignColumn } from './column-sizing';
import CrudTableHeaderLabel from './table-header-label.vue';
import type {
  ActionButton,
  ActionColumn,
  ColumnSchema,
  GroupColumn,
  ImageColumn,
  IndexColumn,
} from './types';

export interface ResolvedTableColumn {
  key: string;
  schema: ColumnSchema;
  width?: string | number;
  minWidth?: string | number;
  fixed?: boolean | 'left' | 'right';
  className?: string;
  children?: ResolvedTableColumn[];
}

export default Vue.extend({
  name: 'CrudTableColumn',
  components: { CrudTableHeaderLabel },
  props: {
    col: { type: Object as () => ResolvedTableColumn, required: true },
  },
  computed: {
    groupHeaderLines(): string[] {
      if (this.col.schema.type !== 'group') return [];
      const group = this.col.schema as GroupColumn;
      if (group.headerLines?.length) return group.headerLines;
      return group.label ? [group.label] : [];
    },
    groupHeaderAlign(): 'left' | 'center' | 'right' {
      if (this.col.schema.type !== 'group') return 'center';
      return this.col.schema.align || 'center';
    },
    leafHeaderLines(): string[] {
      if (this.col.schema.type === 'group') return [];
      return this.col.schema.headerLines?.length ? this.col.schema.headerLines : [];
    },
  },
  methods: {
    rowIndex(index: number): number {
      const schema = this.col.schema as IndexColumn;
      const start = schema.startIndex ?? 1;
      return start + index;
    },
    overflowTooltipEnabled(schema: ColumnSchema): boolean {
      if (schema.showOverflowTooltip === false) return false;
      // 自定义列 / 操作列内是表单控件，开启溢出 tooltip 会悬浮出空白或误展示下拉 DOM
      if (schema.type === 'custom' || schema.type === 'action') return false;
      return true;
    },
    overflowTitle(schema: ColumnSchema, row: Record<string, any>): string {
      if (!this.overflowTooltipEnabled(schema)) return '';
      const text = this.cellText(schema, row);
      return text === '—' ? '' : text;
    },
    /** 对齐：显式 align > 业务文本列左对齐 > 居中 */
    columnAlign(schema: ColumnSchema): 'left' | 'center' | 'right' {
      return schema.align || (isLeftAlignColumn(schema) ? 'left' : 'center');
    },
    columnHeaderAlign(schema: ColumnSchema): 'left' | 'center' | 'right' {
      return schema.headerAlign || this.columnAlign(schema);
    },
    cellText(schema: ColumnSchema, row: Record<string, any>): string {
      const raw = schema.prop ? row[schema.prop] : '';
      if (raw == null || raw === '') return '—';
      if (schema.formatter) return schema.formatter(raw, row, 0);

      if (schema.type === 'date') {
        const mode = schema.timeDisplay ?? 'date';
        return formatDisplay(raw, mode);
      }
      return String(raw);
    },
    tagTypeOf(schema: ColumnSchema, row: Record<string, any>): string {
      if (schema.type !== 'tag') return '';
      const value = schema.prop ? String(row[schema.prop]) : '';
      return schema.tagMap?.[value] ?? schema.tagType ?? '';
    },
    slotNameOf(schema: ColumnSchema): string {
      if (schema.type === 'custom') return schema.slotName || `col-${schema.prop}`;
      return '';
    },
    previewList(schema: ImageColumn, row: Record<string, any>): string[] {
      const src = schema.previewSrcList ? row[schema.previewSrcList] : row[schema.prop];
      if (Array.isArray(src)) return src;
      return src ? [src] : [];
    },
    imageStyle(schema: ImageColumn): Record<string, string> {
      return {
        width: `${schema.imageWidth ?? 40}px`,
        height: `${schema.imageHeight ?? 40}px`,
      };
    },
    visibleButtons(schema: ColumnSchema, row: Record<string, any>): ActionButton[] {
      if (schema.type !== 'action') return [];
      return schema.buttons.filter((button) => !button.hidden?.(row));
    },
    actionMaxVisible(schema: ColumnSchema): number {
      if (schema.type !== 'action') return 99;
      return (schema as ActionColumn).maxVisible ?? 3;
    },
    primaryActionButtons(schema: ColumnSchema, row: Record<string, any>): ActionButton[] {
      return this.visibleButtons(schema, row).slice(0, this.actionMaxVisible(schema));
    },
    overflowActionButtons(schema: ColumnSchema, row: Record<string, any>): ActionButton[] {
      return this.visibleButtons(schema, row).slice(this.actionMaxVisible(schema));
    },
    onActionOverflow(button: ActionButton, row: Record<string, any>, index: number) {
      button.onClick(row, index);
    },
    useCompactHeader(schema: ColumnSchema): boolean {
      return !!(schema.headerTitle || schema.headerTip || schema.headerBadgeTip);
    },
  },
});
</script>

<style lang="scss" scoped>
.crud-action-cell {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px 0;
  max-width: 100%;
}

.crud-action-more {
  padding-left: 2px;
  padding-right: 2px;
}

.crud-action-dropdown-icon {
  margin-right: 6px;
}

.cell-image {
  display: block;
  margin: 0 auto;
  border-radius: 2px;
  overflow: hidden;
}
</style>
