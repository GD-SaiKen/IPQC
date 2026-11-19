<!-- 复制到 views/<page-kebab>/index.vue 底部，或抽成 <page>-form-drawer.vue -->
<template>
  <el-drawer
    v-model="drawerVisible"
    :title="editingId ? '编辑' : '新建'"
    direction="rtl"
    size="480px"
    class="list-form-drawer"
    destroy-on-close
  >
    <div class="list-form-drawer__body">
      <Form
        ref="formRef"
        v-model="formModel"
        :sections="formSections"
        label-width="112px"
        label-position="right"
      />
    </div>
    <div class="list-form-drawer__footer">
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
/**
 * 列表页抽屉表单约定见 crud.md §5.6、vue3-crud.md §3.6
 * 样式：import '@/components/crud/list-form-drawer.scss'（从 knowledge/crud 拷入项目）
 */
import { ref } from 'vue'
import { Form } from '@/components/crud'
import type { FormSection } from '@/components/crud'

const drawerVisible = ref(false)
const submitting = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<InstanceType<typeof Form> | null>(null)
const formModel = ref<Record<string, unknown>>({})
const formSections: FormSection[] = [
  {
    cols: 1,
    fields: [
      {
        type: 'input',
        prop: 'name',
        label: '名称',
        rules: { required: true, message: '请填写名称' },
      },
    ],
  },
]

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  submitting.value = true
  try {
    // await createXxx / updateXxx
    drawerVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>
