<template>
  <div class="ledger-role-binding">
    <table class="ledger-role-binding__table">
      <thead>
        <tr>
          <th>台账角色</th>
          <th>列模板</th>
          <th>绑定文件（在候选路径中搜索）</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in LEDGER_ROLE_OPTIONS" :key="item.role">
          <td>{{ item.label }}</td>
          <td>{{ item.template }}</td>
          <td>
            <el-select-v2
              :model-value="modelValue[item.role] || ''"
              :options="fileOptions"
              :disabled="!candidateFiles.length"
              filterable
              clearable
              placeholder="选择文件"
              class="ledger-role-binding__select"
              @update:model-value="onPick(item.role, String($event || ''))"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!candidateFiles.length" class="ledger-role-binding__hint muted small">
      请在上方树中展开目录加载文件（可勾选目录缩小范围），再为各角色选择路径。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LEDGER_ROLE_OPTIONS } from '@/views/data/ledger-bindings'

const props = defineProps<{
  candidateFiles: string[]
  modelValue: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

const fileOptions = computed(() =>
  props.candidateFiles.map((path) => ({
    value: path,
    label: path,
  })),
)

function onPick(role: string, path: string): void {
  const next = { ...props.modelValue }
  if (!path) {
    delete next[role]
  } else {
    for (const [otherRole, otherPath] of Object.entries(next)) {
      if (otherRole !== role && otherPath === path) {
        delete next[otherRole]
      }
    }
    next[role] = path
  }
  emit('update:modelValue', next)
}
</script>

<style scoped lang="scss">
.ledger-role-binding__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    border: 1px solid var(--el-border-color-lighter);
    padding: 8px 10px;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: var(--el-fill-color-light);
    font-weight: 600;
  }
}

.ledger-role-binding__select {
  width: 100%;
  min-width: 240px;
}

.ledger-role-binding__hint {
  margin-top: 8px;
}
</style>