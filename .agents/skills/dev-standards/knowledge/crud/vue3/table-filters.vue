<template>
  <div v-if="items.length || $slots.default" class="table-filters">
    <div v-for="item in items" :key="item.key" class="table-filters__item">
      <span v-if="item.label" class="table-filters__label">{{ item.label }}</span>
      <DebouncedInput
        v-if="!item.type || item.type === 'input'"
        :model-value="filterValues[item.key] ?? ''"
        :placeholder="item.placeholder"
        :clearable="item.clearable ?? true"
        :style="{ width: controlWidth(item) }"
        :debounce-ms="item.debounceMs ?? defaultDebounceMs"
        @update:model-value="onChange(item.key, $event)"
      />
      <el-select
        v-else-if="item.type === 'select'"
        :model-value="filterValues[item.key]"
        :placeholder="item.placeholder"
        :clearable="item.clearable ?? true"
        :style="{ width: controlWidth(item) }"
        @update:model-value="onChange(item.key, $event)"
      >
        <el-option
          v-for="opt in item.options"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import DebouncedInput from './debounced-input.vue'
import type { FilterItem } from './types'

withDefaults(
  defineProps<{
    items?: FilterItem[]
    /** 筛选项未单独指定时的默认防抖毫秒 */
    defaultDebounceMs?: number
  }>(),
  {
    items: () => [],
    defaultDebounceMs: 300,
  },
)

const filterValues = defineModel<Record<string, any>>('filterValues', { default: () => ({}) })

const emit = defineEmits<{
  change: [key: string, value: any]
}>()

function controlWidth(item: FilterItem): string {
  return item.width || (item.type === 'select' ? '140px' : '160px')
}

function onChange(key: string, val: any) {
  // 就地更新模型对象（不替换引用）：父组件多以 v-model 绑定 reactive 对象，
  // 整体替换会把父级变量重指到新的普通对象，导致父级 computed 不再响应筛选变化
  filterValues.value[key] = val
  emit('change', key, val)
}
</script>

<style lang="scss" scoped>
.table-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.table-filters__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.table-filters__label {
  flex: none;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  white-space: nowrap;
}
</style>
