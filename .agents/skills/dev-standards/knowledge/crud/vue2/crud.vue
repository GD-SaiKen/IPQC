<template>
  <div class="crud-root">
    <div
      v-if="filterItems.length || $slots.filters || $slots['filters-actions']"
      class="crud-header"
      :class="{
        'crud-header--collapsible': filtersCollapsible && filterItems.length,
        'crud-header--filters-collapsed': filtersCollapsible && filterItems.length && !filterPanelOpen,
      }"
    >
      <TableFilters
        v-if="visibleFilterItems.length"
        :items="visibleFilterItems"
        :value="value"
        @input="$emit('input', $event)"
      />
      <div
        v-if="$slots.filters || $slots['filters-actions'] || filtersCollapsible"
        class="crud-filters-actions"
      >
        <el-button
          v-if="filtersCollapsible && filterItems.length"
          size="small"
          type="text"
          :icon="filterPanelOpen ? 'el-icon-arrow-up' : 'el-icon-s-operation'"
          @click="toggleFilterPanel"
        >
          {{ filterPanelOpen ? '收起筛选' : '展开筛选' }}
        </el-button>
        <slot name="filters" />
        <slot name="filters-actions" />
      </div>
    </div>
    <div v-if="$slots.header" class="crud-page-header">
      <slot name="header" />
    </div>
    <div class="crud-table">
      <slot name="table" />
    </div>
    <Pagination v-if="pagination" class="crud-pagination-bar" :config="pagination" />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import type { FilterItem, PaginationConfig } from './types';

import Pagination from './pagination.vue';
import TableFilters from './table-filters.vue';

export default Vue.extend({
  name: 'Crud',
  components: { Pagination, TableFilters },
  props: {
    filterItems: { type: Array as PropType<FilterItem[]>, default: () => [] },
    /** 筛选值对象；组件只在 TableFilters 抛新对象时向外透传 */
    value: { type: Object, default: () => ({}) },
    pagination: {
      type: Object as () => PaginationConfig,
      default: null,
    },
    /** 为 true 时筛选项可折叠，默认收起，收起时仅保留 pinned 项与操作区按钮 */
    filtersCollapsible: { type: Boolean, default: false },
    /** filtersCollapsible 时是否默认展开 */
    filtersDefaultExpanded: { type: Boolean, default: false },
  },
  data() {
    return {
      filterPanelOpen: false,
    };
  },
  computed: {
    visibleFilterItems(): FilterItem[] {
      if (!this.filtersCollapsible) return this.filterItems;
      if (this.filterPanelOpen) return this.filterItems;
      return this.filterItems.filter((item) => !!item.pinned);
    },
  },
  created() {
    if (this.filtersCollapsible && this.filtersDefaultExpanded) {
      this.filterPanelOpen = true;
    }
  },
  methods: {
    toggleFilterPanel() {
      this.filterPanelOpen = !this.filterPanelOpen;
      this.$nextTick(() => {
        this.$emit('filters-panel-change');
      });
    },
  },
});
</script>

<style lang="scss" scoped>
.crud-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  padding: 16px 24px 14px;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: #ffffff;
}

.crud-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 32px;
  flex-shrink: 0;

  /* 筛选项与操作按钮同一换行流：display:contents 让筛选项直接参与 header 的 flex 排版 */
  ::v-deep .table-filters {
    display: contents;
  }

  ::v-deep .table-filters__item {
    display: flex;
    align-items: center;
  }
}

.crud-header--filters-collapsed {
  min-height: 32px;
}

.crud-filters-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: 32px;
  margin-left: auto;
  gap: 10px;
}

.crud-page-header {
  flex-shrink: 0;
  width: 100%;
}

/* 表格板块：细边框 + 圆角 + 白底 + 无阴影，表格贴边 */
.crud-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: #ffffff;
  overflow: hidden;

  /* 插槽内包裹层须参与 flex 高度链，否则横向滚动条沉到内容底部 */
  > * {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
}

.crud-pagination-bar {
  flex-shrink: 0;
}
</style>
