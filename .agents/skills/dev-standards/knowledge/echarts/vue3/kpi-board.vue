<template>
  <div class="kpi-board" :style="gridStyle">
    <div
      v-for="item in items"
      :key="item.label"
      class="kpi-board__item"
      :class="[
        `kpi-board__item--${item.tone ?? 'primary'}`,
        { 'is-clickable': item.onClick, 'is-active': item.onClick && item.active },
      ]"
      :role="item.onClick ? 'button' : undefined"
      :tabindex="item.onClick ? 0 : undefined"
      :aria-pressed="item.onClick ? Boolean(item.active) : undefined"
      @click="item.onClick?.()"
      @keydown.enter.prevent="item.onClick?.()"
    >
      <span class="kpi-board__icon" aria-hidden="true">
        <el-icon :size="18"><component :is="item.icon" /></el-icon>
      </span>
      <div class="kpi-board__text">
        <span
          class="kpi-board__num"
          :class="{ 'is-danger': (item.tone ?? 'primary') === 'danger' }"
        >{{ item.value }}</span>
        <span class="kpi-board__label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';

export type KpiTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface KpiItem {
  value: number | string;
  label: string;
  icon: Component;
  tone?: KpiTone;
  onClick?: () => void;
  /** 点击筛选卡片的选中态（仅在有 onClick 时生效） */
  active?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: KpiItem[];
    /** 桌面端列数，默认与 items 数量一致 */
    columns?: number;
  }>(),
  {},
);

const gridStyle = computed(() => ({
  '--kpi-cols': String(props.columns ?? props.items.length),
}));
</script>

<style lang="scss" scoped>
.kpi-board {
  display: grid;
  grid-template-columns: repeat(var(--kpi-cols, 4), minmax(0, 1fr));
  gap: 12px;

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 14px 16px;
    overflow: hidden;
    border: 1px solid var(--el-border-color, #dcdfe6);
    border-radius: var(--el-border-radius-base, 4px);
    background: var(--el-bg-color, #fff);

    &.is-clickable {
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;

      &:hover,
      &:focus-visible {
        border-color: var(--el-color-primary, #409eff);
        background: var(--el-color-primary-light-9, #ecf5ff);
        outline: none;
      }
    }

    &.is-active {
      border-color: var(--el-color-primary, #409eff);
      background: var(--el-color-primary-light-9, #ecf5ff);
      box-shadow: inset 0 0 0 1px var(--el-color-primary, #409eff);
    }
  }

  &__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }

  &__text {
    min-width: 0;
    text-align: right;
  }

  &__num {
    display: block;
    max-width: 100%;
    overflow: hidden;
    font-size: 26px;
    font-weight: 600;
    line-height: 1;
    text-overflow: ellipsis;

    &.is-danger {
      color: var(--el-color-danger, #f56c6c);
    }
  }

  &__label {
    display: block;
    max-width: 100%;
    margin-top: 4px;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.2;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--el-text-color-secondary, #909399);
  }

  &__item--primary &__icon {
    background: var(--el-color-primary-light-9, #ecf5ff);
    color: var(--el-color-primary, #409eff);
  }

  &__item--success &__icon {
    background: var(--el-color-success-light-9, #f0f9eb);
    color: var(--el-color-success, #67c23a);
  }

  &__item--warning &__icon {
    background: var(--el-color-warning-light-9, #fdf6ec);
    color: var(--el-color-warning, #e6a23c);
  }

  &__item--danger &__icon {
    background: var(--el-color-danger-light-9, #fef0f0);
    color: var(--el-color-danger, #f56c6c);
  }

  &__item--info &__icon {
    background: var(--el-fill-color-light, #f5f7fa);
    color: var(--el-color-info, #909399);
  }

  @media (max-width: 1280px) {
    grid-template-columns: repeat(6, minmax(0, 1fr));

    &__item {
      grid-column: span 2;
    }

    &__item:nth-child(n + 4) {
      grid-column: span 3;
    }
  }

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    &__item,
    &__item:nth-child(n + 4) {
      grid-column: span 1;
      min-height: 64px;
      padding: 10px 12px;

      .kpi-board__num {
        font-size: 22px;
      }

      .kpi-board__label {
        font-size: 11px;
      }
    }
  }
}
</style>
