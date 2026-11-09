<template>
  <div>
    <el-alert
      v-if="workshopKey === '注塑毛边'"
      title="首件源表未覆盖该责任区"
      type="info"
      description="合格率显示为 —，不表示 0% 全数 NG。"
      show-icon
      style="margin-bottom: 12px"
    />
    <div class="page-card">
      <h3>首件 / 巡检记录</h3>
      <el-table :data="rows" size="small" max-height="520" stripe>
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="pn" label="料号" width="120" />
        <el-table-column prop="item" label="检验项" min-width="140" />
        <el-table-column prop="stage" label="阶段" width="130" />
        <el-table-column label="判定" width="100">
          <template #default="{ row }">
            <el-select
              v-model="row.result"
              size="small"
              @change="onEdit(row)"
            >
              <el-option label="OK" value="OK" />
              <el-option label="NG" value="NG" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="NG 确认" width="160">
          <template #default="{ row }">{{ confirmOf(row) }}</template>
        </el-table-column>
        <el-table-column prop="fb" label="反馈(min)" width="90" />
        <el-table-column prop="iv" label="介入(min)" width="90" />
        <el-table-column prop="status" label="状态" width="100" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { faNgConfirmLabel } from '@/domain/ipqc/fa-rules'
import { shortDept } from '@/domain/ipqc/format'
import type { FaRecord, WorkshopKey } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const workshopKey = computed(() => store.workshop as WorkshopKey)

const rows = computed(() =>
  store.db.fa.filter((r) => shortDept(r.dept) === workshopKey.value)
)

function confirmOf(row: FaRecord) {
  return faNgConfirmLabel(row.result, row.stage)
}

function onEdit(_row: FaRecord) {
  store.persist()
}
</script>

<style scoped>
h3 {
  margin: 0 0 12px;
}
</style>
