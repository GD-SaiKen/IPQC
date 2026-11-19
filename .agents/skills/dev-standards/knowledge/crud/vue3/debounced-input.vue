<template>
  <el-input :model-value="localValue" v-bind="$attrs" @update:model-value="onInput" />
</template>

<script setup lang="ts">
/**
 * 防抖输入框：本地立即回显，对外延迟提交。
 * 直接给 el-input 绑 :model-value 再延迟回写，会让受控值在重渲染时把输入打回旧值，
 * 所以必须用组件内部的 localValue 承接输入。
 *
 * 复制到 src/components/debounced-input.vue；table-filters.vue 依赖它。
 */
import { onBeforeUnmount, ref, watch } from 'vue'

defineOptions({ inheritAttrs: false, name: 'DebouncedInput' })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    debounceMs?: number
  }>(),
  {
    modelValue: '',
    debounceMs: 300,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue ?? '')

// 外部重置（清空筛选、回填）时同步到本地
watch(
  () => props.modelValue,
  (value) => {
    const next = value ?? ''
    if (next !== localValue.value) localValue.value = next
  },
)

let timer: number | undefined
function cancel() {
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timer = undefined
  }
}

const commit = (value: string) => {
  timer = undefined
  emit('update:modelValue', value)
}

function onInput(value: string) {
  const next = value ?? ''
  localValue.value = next
  cancel()
  // 清空立即生效：用户点清除按钮时不应该再等一个防抖周期
  if (props.debounceMs <= 0 || next === '') {
    emit('update:modelValue', next)
    return
  }
  timer = window.setTimeout(() => commit(next), props.debounceMs)
}

onBeforeUnmount(cancel)
</script>
