<template>
  <div class="pagination" :class="{ 'is-fixed': fixed }">
    <el-pagination
      :current-page="currentPage"
      :page-size="currentPageSize"
      :total="config.total"
      :layout="config.layout || 'total, sizes, prev, pager, next, jumper'"
      :page-sizes="config.pageSizes || [10, 20, 50, 100]"
      :background="config.background !== false"
      :small="config.small !== false"
      :disabled="config.disabled === true"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import type { PaginationConfig } from './types';

export default Vue.extend({
  name: 'CrudPagination',
  props: {
    config: { type: Object as () => PaginationConfig, required: true },
    fixed: { type: Boolean, default: false },
  },
  computed: {
    currentPage() {
      return this.config.page || 1;
    },
    currentPageSize() {
      return this.config.pageSize || 20;
    },
  },
  methods: {
    onPageChange(page: number) {
      if (this.config.onPageChange) this.config.onPageChange(page);
      this.$emit('update:page', page);
    },
    onSizeChange(size: number) {
      if (this.config.onSizeChange) this.config.onSizeChange(size);
      this.$emit('update:pageSize', size);
    },
  },
});
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 32px;
}

.pagination ::v-deep .el-pagination {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  min-height: 32px;
  line-height: 32px;
}

.pagination ::v-deep .el-pagination__total,
.pagination ::v-deep .el-pagination__sizes,
.pagination ::v-deep .el-pagination__jump {
  display: inline-flex;
  align-items: center;
  height: 32px;
  margin-top: 0;
  margin-bottom: 0;
  line-height: 32px;
}

.pagination ::v-deep .el-pagination__sizes {
  margin-right: 10px;
}

.pagination ::v-deep .el-pagination__jump {
  margin-left: 10px;
}

.pagination ::v-deep .el-pagination__editor.el-input {
  height: 32px;
}

.pagination ::v-deep .el-pagination__editor.el-input .el-input__inner,
.pagination ::v-deep .el-pagination__sizes .el-input .el-input__inner,
.pagination ::v-deep .el-pagination__sizes .el-select .el-input__inner {
  height: 32px;
  line-height: 32px;
}

.pagination ::v-deep .btn-prev,
.pagination ::v-deep .btn-next,
.pagination ::v-deep .el-pager li {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  min-width: 32px;
  line-height: 32px;
}

/* Element small + background 会把当前页压成 22px，与其它页码不齐 */
.pagination ::v-deep .el-pagination--small .el-pager li,
.pagination ::v-deep .el-pagination.is-background .el-pager li.active {
  height: 32px;
  min-width: 32px;
  line-height: 32px;
}

.pagination.is-fixed {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
  z-index: 10;
}
</style>
