<template>
  <SectionCard v-if="title" :title="title">
    <el-table :data="data" size="small" stripe max-height="480" v-bind="$attrs">
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
      />
    </el-table>
  </SectionCard>
  <div v-else class="page-card">
    <el-table :data="data" size="small" stripe max-height="480" v-bind="$attrs">
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
      />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import SectionCard from '@/components/section-card/section-card.vue'

defineProps<{
  title?: string
  data: Record<string, unknown>[]
  columns: { prop: string; label: string; width?: number; minWidth?: number }[]
}>()
</script>

