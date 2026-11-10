<template>
  <svg v-if="data.length" class="spark" viewBox="0 0 74 22" role="img" aria-label="趋势">
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
  </svg>
  <span v-else class="muted">—</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ data: number[]; color?: string }>(),
  { color: '#2563eb' }
)

const points = computed(() => {
  const { data } = props
  if (!data.length) return ''
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * 74
      const y = 20 - ((v - min) / range) * 17
      return `${x},${y}`
    })
    .join(' ')
})
</script>

<style scoped>
.spark {
  width: 74px;
  height: 22px;
  overflow: visible;
}
.muted {
  color: #a8b6c7;
}
</style>
