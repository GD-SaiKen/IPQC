<template>
  <div class="chart-card" :class="{ 'chart-card--full': full }">
    <div class="chart-card__title">{{ title }}</div>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    full?: boolean;
  }>(),
  {
    full: false,
  },
);
</script>

<style lang="scss" scoped>
.chart-card {
  flex-shrink: 0;
  padding: 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: var(--el-border-radius-small, 2px);
  overflow: hidden;

  &__title {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary, #909399);
  }

  &--full {
    grid-column: 1 / -1;
  }

  :slotted(.chart-card__empty) {
    padding: 60px 0;
    font-size: 12px;
    text-align: center;
    color: var(--el-text-color-secondary, #909399);
  }
}
</style>
