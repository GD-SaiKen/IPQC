<template>
  <div class="charts-panel">
    <div class="charts-panel__toggle" @click="open = !open">
      <span>{{ title }}</span>
      <el-icon class="charts-panel__arrow" :class="{ 'is-open': open }"><ArrowDown /></el-icon>
    </div>
    <div v-if="open" class="charts-panel__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    defaultOpen?: boolean;
  }>(),
  {
    title: '图表分析',
    defaultOpen: false,
  },
);

const open = ref(props.defaultOpen);
</script>

<style lang="scss" scoped>
.charts-panel {
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: var(--el-border-radius-base, 4px);

  &__toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary, #303133);
    cursor: pointer;
    user-select: none;

    &:hover {
      color: var(--el-color-primary, #409eff);
    }
  }

  &__arrow {
    color: var(--el-text-color-secondary, #909399);
    transition: transform 0.2s ease;

    &.is-open {
      transform: rotate(180deg);
    }
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 16px 16px;
  }
}

:deep(.chart-card) {
  padding: 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: var(--el-border-radius-small, 2px);

  .chart-card__title {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary, #909399);
  }

  .chart-card__empty {
    padding: 60px 0;
    font-size: 12px;
    text-align: center;
    color: var(--el-text-color-secondary, #909399);
  }

  &.chart-card--full {
    grid-column: 1 / -1;
  }
}
</style>
