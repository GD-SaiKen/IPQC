<template>
  <div v-if="items.length" class="table-filters">
    <div v-for="item in items" :key="item.key" class="table-filters__item">
      <span v-if="item.label" class="table-filters__label">{{ item.label }}</span>

      <el-input
        v-if="!item.type || item.type === 'input'"
        :value="value[item.key]"
        :placeholder="item.placeholder"
        :clearable="item.clearable !== false"
        :style="{ width: item.width || '220px' }"
        size="small"
        @input="onTextInput(item, $event)"
      />

      <el-select
        v-else-if="item.type === 'select'"
        :value="value[item.key]"
        :placeholder="item.placeholder"
        :clearable="item.clearable !== false"
        :multiple="item.multiple === true"
        :collapse-tags="item.collapseTags === true"
        :style="{ width: item.width || '140px' }"
        size="small"
        @change="onChange(item.key, $event)"
      >
        <el-option
          v-for="option in item.options"
          :key="String(option.value)"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-date-picker
        v-else-if="item.type === 'daterange'"
        :value="value[item.key]"
        type="daterange"
        size="small"
        value-format="yyyy-MM-dd"
        format="yyyy-MM-dd"
        :start-placeholder="item.startPlaceholder || '开始日期'"
        :end-placeholder="item.endPlaceholder || '结束日期'"
        :clearable="item.clearable !== false"
        :style="{ width: item.width || '260px' }"
        @input="onChange(item.key, $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import type { FilterItem } from './types';

export default Vue.extend({
  name: 'CrudTableFilters',
  props: {
    items: { type: Array as () => FilterItem[], default: () => [] },
    value: { type: Object as PropType<Record<string, any>>, default: () => ({}) },
  },
  data() {
    return {
      // 防抖计时器：按筛选项 key 分开存，互不干扰
      timers: {} as Record<string, number>,
    };
  },
  beforeDestroy() {
    Object.keys(this.timers).forEach((key) => window.clearTimeout(this.timers[key]));
  },
  methods: {
    /** 文本输入：按 item.debounceMs 延迟提交，清空立即生效 */
    onTextInput(item: FilterItem, value: string) {
      const key = item.key;
      const ms = item.debounceMs ?? 300;
      if (this.timers[key]) window.clearTimeout(this.timers[key]);

      if (ms <= 0 || value === '') {
        this.onChange(key, value);
        return;
      }
      this.timers[key] = window.setTimeout(() => {
        this.onChange(key, value);
      }, ms);
    },
    onChange(key: string, value: string | number | boolean | string[] | null | undefined) {
      // Vue 2 惯例：抛出**新对象**，由父级 v-model 整体替换
      this.$emit('input', { ...this.value, [key]: value });
      this.$emit('change', key, value);
    },
  },
});
</script>

<style lang="scss" scoped>
.table-filters {
  display: flex;
  align-items: center;
  min-height: 32px;
  gap: 10px;
  flex-wrap: wrap;
}

.table-filters ::v-deep .el-input,
.table-filters ::v-deep .el-select,
.table-filters ::v-deep .el-input__inner {
  vertical-align: middle;
}

.table-filters ::v-deep .el-input__inner,
.table-filters ::v-deep .el-select .el-input__inner {
  height: 32px;
  line-height: 32px;
}

.table-filters ::v-deep .el-range-editor.el-input__inner {
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}

.table-filters ::v-deep .el-range-editor .el-range-input {
  font-size: 13px;
}

.table-filters__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-filters__label {
  color: #909399;
  font-size: 13px;
  white-space: nowrap;
}
</style>
