<template>
  <div class="page-card">
    <h3 v-if="title">{{ title }}</h3>
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
defineProps<{
  title?: string
  data: Record<string, unknown>[]
  columns: { prop: string; label: string; width?: number; minWidth?: number }[]
}>()
</script>

<style scoped>
h3 {
  margin: 0 0 12px;
}
</style>
