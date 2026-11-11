<template>
  <div class="hbar">
    <div
      v-for="it in items"
      :key="it.label"
      class="hbar__row"
      :title="it.title || `${it.label}：${it.value}`"
    >
      <div class="hbar__name">{{ it.label }}</div>
      <div class="hbar__track">
        <i
          :style="{
            width: `${Math.max(1.5, (it.value / max) * 100)}%`,
            background: it.color || color,
          }"
        />
      </div>
      <div class="hbar__val">{{ it.text != null ? it.text : it.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface HBarItem {
  label: string
  value: number
  text?: string | number
  color?: string
  title?: string
}

const props = withDefaults(
  defineProps<{ items: HBarItem[]; color?: string; max?: number }>(),
  { color: '#2563eb', max: 0 }
)

const max = computed(
  () => props.max || Math.max(1, ...props.items.map((i) => i.value))
)
</script>

<style scoped>
.hbar {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.hbar__row {
  display: grid;
  grid-template-columns: 96px 1fr 64px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.hbar__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #46586e;
}
.hbar__track {
  height: 8px;
  border-radius: 4px;
  background: #eef2f8;
  overflow: hidden;
}
.hbar__track i {
  display: block;
  height: 8px;
  border-radius: 4px;
}
.hbar__val {
  text-align: right;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}
</style>
