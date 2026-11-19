<template>
  <div class="form-root" :class="[props.className, { 'form-box': box }]">
    <el-form
      ref="formRef"
      :model="currentModel"
      :label-width="props.labelWidth"
      :label-position="props.labelPosition"
      :size="props.size"
      :disabled="props.disabled"
    >
    <!-- 分区循环 -->
    <template v-for="(section, si) in visibleSections" :key="si">
      <div
        class="form-section"
        :class="{ 'is-collapsed': isCollapsed(si), 'is-boxed': section.boxed }"
      >
        <!-- 分区标题行 -->
        <div
          class="form-section-header"
          :class="{ 'is-clickable': section.collapsible }"
          @click="section.collapsible && toggleSection(si)"
        >
          <div class="form-section-title-line">
            <span v-if="section.title" class="form-section-title">{{ section.title }}</span>
            <span v-if="section.description" class="form-section-desc">{{ section.description }}</span>
          </div>
          <el-icon v-if="section.collapsible" class="section-toggle-icon">
            <ArrowDown v-if="!collapsedMap[si]" />
            <ArrowRight v-else />
          </el-icon>
        </div>

        <!-- 分区内容 -->
        <transition name="form-section-collapse">
          <div v-show="!isCollapsed(si)" class="form-section-body">
            <!-- 自定义插槽模式 -->
            <slot v-if="section.slotName" :name="section.slotName" :model="currentModel" />

            <!-- 字段列表模式 -->
            <template v-else>
              <el-row :gutter="20">
                <template v-for="field in section.fields" :key="field.prop">
                  <el-col v-if="isFieldVisible(field)" :span="fieldColSpan(section, field)">
                    <el-form-item
                      :prop="field.prop"
                      :rules="normalizeRules(field.rules)"
                      :error="fieldErrors[field.prop]"
                      :label-position="props.labelPosition"
                      :label-width="field.labelWidth ?? props.labelWidth"
                    >
                      <!-- label + 说明图标 -->
                      <template #label>
                        <span class="form-label">
                          <span class="form-label-text">{{ field.label }}</span>
                          <el-tooltip v-if="field.tip" :content="field.tip" placement="top" :show-after="300">
                            <el-icon class="form-label-tip"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </span>
                      </template>

                      <!-- ===== input ===== -->
                      <el-input
                        v-if="!field.type || field.type === 'input'"
                        :model-value="currentModel[field.prop]"
                        :placeholder="field.placeholder"
                        :disabled="field.disabled || disabled"
                        :readonly="field.readonly"
                        :clearable="field.clearable ?? true"
                        :maxlength="field.maxlength"
                        :show-word-limit="field.showWordLimit"
                        :show-password="field.showPassword"
                        :style="{ width: field.width || '100%' }"
                        @update:model-value="onFieldChange(field, $event)"
                      >
                        <template v-if="field.prefixIcon" #prefix>
                          <el-icon><component :is="field.prefixIcon" /></el-icon>
                        </template>
                        <template v-if="field.suffix || field.suffixIcon" #suffix>
                          <el-icon v-if="field.suffixIcon"><component :is="field.suffixIcon" /></el-icon>
                          <span v-if="field.suffix">{{ field.suffix }}</span>
                        </template>
                      </el-input>

                      <!-- ===== textarea ===== -->
                      <el-input
                        v-else-if="field.type === 'textarea'"
                        type="textarea"
                        :model-value="currentModel[field.prop]"
                        :placeholder="field.placeholder"
                        :disabled="field.disabled || disabled"
                        :readonly="field.readonly"
                        :rows="field.rows ?? 3"
                        :maxlength="field.maxlength"
                        :show-word-limit="field.showWordLimit"
                        :style="{ width: field.width || '100%' }"
                        @update:model-value="onFieldChange(field, $event)"
                      />

                      <!-- ===== select ===== -->
                      <el-select
                        v-else-if="field.type === 'select'"
                        :model-value="currentModel[field.prop]"
                        :placeholder="field.placeholder"
                        :disabled="field.disabled || disabled"
                        :clearable="field.clearable ?? true"
                        :filterable="field.filterable"
                        :allow-create="field.allowCreate"
                        :multiple="field.multiple"
                        :style="{ width: field.width || '100%' }"
                        @update:model-value="onFieldChange(field, $event)"
                      >
                        <el-option
                          v-for="opt in field.options"
                          :key="String(opt.value)"
                          :label="opt.label"
                          :value="opt.value"
                        />
                      </el-select>

                      <!-- ===== radio ===== -->
                      <el-radio-group
                        v-else-if="field.type === 'radio'"
                        :model-value="currentModel[field.prop]"
                        :disabled="field.disabled || disabled"
                        @update:model-value="onFieldChange(field, $event)"
                      >
                        <el-radio
                          v-for="opt in field.options"
                          :key="String(opt.value)"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </el-radio>
                      </el-radio-group>

                      <!-- ===== checkbox ===== -->
                      <el-checkbox-group
                        v-else-if="field.type === 'checkbox'"
                        :model-value="currentModel[field.prop]"
                        :disabled="field.disabled || disabled"
                        @update:model-value="onFieldChange(field, $event)"
                      >
                        <el-checkbox
                          v-for="opt in field.options"
                          :key="String(opt.value)"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </el-checkbox>
                      </el-checkbox-group>

                      <!-- ===== switch ===== -->
                      <el-switch
                        v-else-if="field.type === 'switch'"
                        :model-value="currentModel[field.prop]"
                        :disabled="field.disabled || disabled"
                        @update:model-value="onFieldChange(field, $event)"
                      />

                      <!-- ===== date ===== -->
                      <el-date-picker
                        v-else-if="field.type === 'date'"
                        :model-value="currentModel[field.prop]"
                        type="date"
                        :placeholder="field.placeholder"
                        :disabled="field.disabled || disabled"
                        :clearable="field.clearable ?? true"
                        :format="field.format ?? 'YYYY-MM-DD'"
                        :value-format="field.valueFormat ?? 'YYYY-MM-DD'"
                        :style="{ width: field.width || '100%' }"
                        @update:model-value="onFieldChange(field, $event)"
                      />

                      <!-- ===== number ===== -->
                      <el-input-number
                        v-else-if="field.type === 'number'"
                        :model-value="currentModel[field.prop]"
                        :placeholder="field.placeholder"
                        :disabled="field.disabled || disabled"
                        :min="field.min"
                        :max="field.max"
                        :step="field.step ?? 1"
                        :style="{ width: field.width || '100%' }"
                        @update:model-value="onFieldChange(field, $event)"
                      />

                      <!-- ===== readonly（详情展示）===== -->
                      <div
                        v-else-if="field.type === 'readonly'"
                        class="form-readonly"
                        :style="{ width: field.width || '100%' }"
                      >
                        <span v-if="field.formatter">
                          {{ field.formatter(currentModel[field.prop], currentModel) }}
                        </span>
                        <span v-else>{{ currentModel[field.prop] ?? '-' }}</span>
                      </div>

                      <!-- ===== custom 插槽 ===== -->
                      <slot
                        v-else-if="field.type === 'custom'"
                        :name="field.slotName ?? `form-${field.prop}`"
                        :value="currentModel[field.prop]"
                        :model="currentModel"
                        :field="field"
                      />
                    </el-form-item>
                  </el-col>
                </template>
              </el-row>
            </template>
          </div>
        </transition>
      </div>
    </template>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormItemRule } from 'element-plus'
import { ArrowDown, ArrowRight, QuestionFilled } from '@element-plus/icons-vue'
import type { FormField, FormFieldRule, FormProps } from './types'

const props = withDefaults(defineProps<FormProps>(), {
  labelWidth: '100px',
  labelPosition: 'left',
  size: '' as const,
  disabled: false,
  box: false,
  className: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const currentModel = computed(() => props.modelValue)

const formRef = ref<FormInstance>()
const fieldErrors = reactive<Record<string, string>>({})

function normalizeRules(rules?: FormFieldRule | FormFieldRule[]): FormItemRule[] | undefined {
  if (!rules) return undefined
  const list = Array.isArray(rules) ? rules : [rules]
  return list.map((rule) => ({ ...rule, trigger: rule.trigger ?? 'blur' }))
}

// ---- 折叠 ----
const collapsedMap = reactive<Record<number, boolean>>({})
watch(
  () => props.sections,
  (sections) => {
    sections.forEach((s, i) => {
      if (s.collapsible) collapsedMap[i] = s.defaultCollapsed ?? false
    })
  },
  { immediate: true },
)

function isCollapsed(idx: number) {
  return collapsedMap[idx] ?? false
}
function toggleSection(idx: number) {
  collapsedMap[idx] = !collapsedMap[idx]
}

// ---- 可见分区 ----
const visibleSections = computed(() =>
  props.sections.filter((s) => {
    if (typeof s.hidden === 'function') return !s.hidden(currentModel.value)
    return !s.hidden
  }),
)

// ---- 可见字段 ----
function isFieldVisible(field: FormField): boolean {
  if (typeof field.hidden === 'function') return !field.hidden(currentModel.value)
  return !field.hidden
}

// ---- 列宽 ----
function colSpan(section: { cols?: number }): number {
  return Math.floor(24 / (section.cols ?? 1))
}

/** 字段级 colSpan 优先于分区级 cols */
function fieldColSpan(section: { cols?: number }, field: { colSpan?: number }): number {
  if (field.colSpan) {
    return Math.min(24, Math.floor((24 / (section.cols ?? 1)) * field.colSpan))
  }
  return colSpan(section)
}

// ---- 字段值变化 ----
function onFieldChange(field: FormField, val: any) {
  const newModel = { ...currentModel.value, [field.prop]: val }
  emit('update:modelValue', newModel)
  field.onChange?.(val, newModel)
}

// ---- 对外方法 ----
/** 走 Element Plus 表单校验；未写 `trigger` 的规则默认 `blur` */
async function validate(): Promise<boolean> {
  if (!formRef.value) return true
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

function getModel(): Record<string, any> {
  return { ...currentModel.value }
}
function clearErrors() {
  formRef.value?.clearValidate()
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
}

defineExpose({ validate, getModel, clearErrors })
</script>

<style lang="scss" scoped>
.form-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
}

.form-root.form-box {
  background: var(--el-bg-color, #fff);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  padding: 20px 24px;
}

// ===== 分区 =====
.form-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

// ===== 分区卡片化（边框 + 浅色表头条，弹窗内做区隔）=====
.form-section.is-boxed {
  margin-bottom: 14px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: var(--el-bg-color, #fff);
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }

  .form-section-header {
    margin: 0;
    padding: 11px 14px;
    background: #f8fafd;
    border-bottom: 1px solid #e3e8f0;

    .form-section-title {
      font-size: 13.5px;
      font-weight: 700;
    }

    .form-section-desc {
      font-size: 11.5px;
      color: #7a8494;
    }
  }

  .form-section-body {
    padding: 14px;
    min-width: 0;

    :deep(.el-col) {
      margin-bottom: 0;
    }
  }
}

.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;

  &.is-clickable {
    cursor: pointer;
    user-select: none;

    &:hover .form-section-title {
      color: var(--el-color-primary, #409eff);
    }
  }
}

.form-section-title-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  min-width: 0;
  flex: 1;
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  transition: color 0.2s;
}

.form-section-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.section-toggle-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary, #909399);
}

.form-section-body {
  padding-top: 4px;
  min-width: 0;
  max-width: 100%;

  // el-row gutter 负边距在弹窗等窄容器内会撑出横向滚动
  :deep(.el-row) {
    width: 100%;
    max-width: 100%;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  :deep(.el-col) {
    margin-bottom: 22px;
    padding-left: 10px !important;
    padding-right: 10px !important;

    &:first-child {
      padding-left: 0 !important;
    }

    &:last-child {
      padding-right: 0 !important;
    }
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    align-items: flex-start;
    justify-content: flex-end;
    text-align: right;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }
}

// 折叠过渡
.form-section-collapse-enter-active,
.form-section-collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.form-section-collapse-enter-from,
.form-section-collapse-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: -12px;
}

// ===== 小元素 =====
.form-readonly {
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
  line-height: 32px;
  padding: 0 4px;
}

// ===== label 说明图标 =====
.form-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  line-height: 1.4;
}

.form-label-text {
  text-align: right;
}

.form-label-tip {
  font-size: 13px;
  color: var(--el-text-color-placeholder, #a8abb2);
  cursor: help;
}
</style>
