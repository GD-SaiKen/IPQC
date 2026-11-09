<template>
  <div class="page-card">
    <h3>数据与设置</h3>
    <p class="muted">本机 localStorage 自动保存；建议每月导出 JSON 备份。</p>
    <el-space wrap>
      <el-button type="primary" @click="onExport">导出 JSON</el-button>
      <el-button @click="pickFile">导入 JSON</el-button>
      <el-button type="danger" @click="onReset">恢复原始种子</el-button>
    </el-space>
    <input ref="fileRef" type="file" accept=".json" hidden @change="onFile" />
    <ul class="counts">
      <li v-for="c in counts" :key="c[0]">{{ c[0] }}：{{ c[1] }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useIpqcStore } from '@/stores/ipqc'

const store = useIpqcStore()
const fileRef = ref<HTMLInputElement | null>(null)

const counts = computed(() => [
  ['首件记录', store.db.fa.length],
  ['终检 NG', store.db.fqcNg.length],
  ['投诉', store.db.cmp.length],
  ['绩效明细', store.db.perf.length],
  ['培训场次', store.db.trn.length],
])

function onExport() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ipqc-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function pickFile() {
  fileRef.value?.click()
}

function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      store.importFromJson(String(reader.result))
      ElMessageBox.alert('导入成功', '提示')
    } catch {
      ElMessageBox.alert('文件格式无效', '导入失败')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

async function onReset() {
  await ElMessageBox.confirm('将清除本机所有编辑并恢复种子数据，是否继续？', '恢复原始数据', {
    type: 'warning',
  })
  store.restoreSeed()
}
</script>

<style scoped>
.muted {
  color: #64748b;
  font-size: 13px;
}
.counts {
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.8;
}
h3 {
  margin-top: 0;
}
</style>
