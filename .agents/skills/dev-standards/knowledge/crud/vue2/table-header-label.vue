<template>
  <el-tooltip :disabled="!showCellTip" placement="top" :open-delay="220">
    <div slot="content" class="th-header-tip">
      <div v-for="(line, index) in tipLines" :key="index">{{ line }}</div>
    </div>
    <span class="th-header-compact">
      <span class="th-header-compact__text">{{ displayTitle }}</span>
      <el-tooltip
        v-if="badgeTip"
        :content="badgeTip"
        placement="top"
        :open-delay="150"
      >
        <span class="th-header-compact__badge-wrap" @click.stop>
          <el-badge :value="'!'" class="th-header-compact__badge">
            <span class="th-header-compact__badge-ph" aria-hidden="true" />
          </el-badge>
        </span>
      </el-tooltip>
    </span>
  </el-tooltip>
</template>

<script lang="ts">
import Vue from 'vue';

import type { ColumnSchema } from './types';

export default Vue.extend({
  name: 'CrudTableHeaderLabel',
  props: {
    schema: { type: Object as () => ColumnSchema, required: true },
  },
  computed: {
    displayTitle(): string {
      const title = this.schema.headerTitle || this.schema.label || '';
      if (this.showAbbrevPrefix) return `…${title}`;
      return title;
    },
    tipLines(): string[] {
      const tip = this.schema.headerTip;
      if (!tip) return [];
      return tip.split('\n').map((line) => line.trim()).filter(Boolean);
    },
    /** 带徽标的分组表头：仅徽标悬浮提示，不包裹整格 tooltip */
    showCellTip(): boolean {
      if (!this.tipLines.length) return false;
      if (this.schema.headerBadge && this.badgeTip) return false;
      return true;
    },
    showAbbrevPrefix(): boolean {
      return this.showCellTip && this.schema.headerAbbrevPrefix !== false;
    },
    badgeTip(): string {
      if (!this.schema.headerBadge) return '';
      return this.schema.headerBadgeTip?.trim() || '';
    },
  },
});
</script>

<style lang="scss" scoped>
.th-header-compact {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
  white-space: nowrap;
  vertical-align: middle;
}

.th-header-compact__text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.th-header-compact__badge-wrap {
  display: inline-flex;
  flex-shrink: 0;
  cursor: help;
  line-height: 1;
}

.th-header-compact__badge-ph {
  display: inline-block;
  width: 6px;
  height: 1px;
}

.th-header-compact__badge ::v-deep .el-badge__content {
  height: 14px;
  padding: 0 4px;
  line-height: 14px;
  font-size: 11px;
  font-weight: 600;
  color: #7a8494;
  background-color: #e8ebf0;
  border: 1px solid #e3e8f0;
}
</style>
