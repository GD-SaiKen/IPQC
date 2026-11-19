<template>
  <div class="form-root" :class="[className, { 'form-box': box }]">
    <div
      v-for="(section, sectionIndex) in visibleSections"
      :key="sectionIndex"
      class="form-section"
      :class="{ 'is-boxed': section.boxed, 'has-step': hasStep(section) }"
    >
      <div
        class="form-section-header"
        :class="{
          'is-clickable': section.collapsible,
          'form-section-header--emphasis': section.boxed || hasStep(section),
        }"
        @click="section.collapsible && toggleSection(sectionIndex)"
      >
        <div class="form-section-header__main">
          <span v-if="hasStep(section)" class="form-section-step">{{ section.step }}</span>
          <div class="form-section-heading">
            <span v-if="section.title" class="form-section-title">{{ section.title }}</span>
            <span v-if="section.description" class="form-section-desc">{{ section.description }}</span>
          </div>
        </div>
        <i
          v-if="section.collapsible"
          class="form-section-header__caret"
          :class="collapsedMap[sectionIndex] ? 'el-icon-arrow-right' : 'el-icon-arrow-down'"
        />
      </div>
      <div v-show="!isCollapsed(sectionIndex)" class="form-section-body">
        <slot v-if="section.slotName" :name="section.slotName" :model="boundModel" />
        <el-row v-else :gutter="20">
          <el-col
            v-for="field in section.fields"
            v-show="isFieldVisible(field)"
            :key="field.prop"
            :span="fieldColSpan(section, field)"
          >
            <el-form-item
              :prop="field.prop"
              :rules="field.rules"
              :error="fieldErrors[field.prop]"
              :label-width="field.labelWidth || labelWidth"
            >
              <span slot="label" class="form-label"
                >{{ field.label
                }}<el-tooltip v-if="field.tip" :content="field.tip" placement="top"
                  ><i class="el-icon-question" /></el-tooltip
              ></span>
              <!--
                Element UI 2 的组件没有 v-model 透传，统一用 :value + @input 单向落地：
                父层拿到的是「新对象」，不做就地改属性（Vue 2 改属性不会触发响应式）。
                文本类用 @input，select / 日期等用 @change 更稳（see vue2-crud.md 易错点）。
              -->
              <el-input
                v-if="!field.type || field.type === 'input' || field.type === 'textarea'"
                :value="boundModel[field.prop]"
                :type="field.type === 'textarea' ? 'textarea' : 'text'"
                :rows="field.rows || 3"
                :placeholder="field.placeholder"
                :disabled="field.disabled || disabled"
                :readonly="field.readonly"
                :clearable="field.clearable !== false"
                :maxlength="field.maxlength"
                :show-word-limit="field.showWordLimit"
                :show-password="field.showPassword"
                :style="fieldStyle(field)"
                @input="onFieldChange(field, $event)"
              />
              <el-select
                v-else-if="field.type === 'select'"
                :value="boundModel[field.prop]"
                :placeholder="field.placeholder"
                :disabled="field.disabled || disabled"
                :clearable="field.clearable !== false"
                :filterable="field.filterable"
                :multiple="field.multiple"
                :style="fieldStyle(field)"
                @change="onFieldChange(field, $event)"
              >
                <el-option
                  v-for="option in field.options"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-radio-group
                v-else-if="field.type === 'radio'"
                :value="boundModel[field.prop]"
                :disabled="field.disabled || disabled"
                @input="onFieldChange(field, $event)"
              >
                <el-radio
                  v-for="option in field.options"
                  :key="String(option.value)"
                  :label="option.value"
                  >{{ option.label }}</el-radio
                >
              </el-radio-group>
              <el-checkbox-group
                v-else-if="field.type === 'checkbox'"
                :value="boundModel[field.prop]"
                :disabled="field.disabled || disabled"
                @input="onFieldChange(field, $event)"
              >
                <el-checkbox
                  v-for="option in field.options"
                  :key="String(option.value)"
                  :label="option.value"
                  >{{ option.label }}</el-checkbox
                >
              </el-checkbox-group>
              <el-switch
                v-else-if="field.type === 'switch'"
                :value="boundModel[field.prop]"
                :disabled="field.disabled || disabled"
                @input="onFieldChange(field, $event)"
              />
              <!-- Element UI 2 用 yyyy-MM-dd（小写 dd）；写成 YYYY-MM-DD 会直接渲染成字面量 -->
              <el-date-picker
                v-else-if="field.type === 'date'"
                :value="boundModel[field.prop]"
                type="date"
                :placeholder="field.placeholder"
                :disabled="field.disabled || disabled"
                :clearable="field.clearable !== false"
                :format="field.format || 'yyyy-MM-dd'"
                :value-format="field.valueFormat || 'yyyy-MM-dd'"
                :style="fieldStyle(field)"
                @change="onFieldChange(field, $event)"
              />
              <el-input-number
                v-else-if="field.type === 'number'"
                :value="boundModel[field.prop]"
                :min="field.min"
                :max="field.max"
                :step="field.step || 1"
                :disabled="field.disabled || disabled"
                :style="fieldStyle(field)"
                @input="onFieldChange(field, $event)"
              />
              <div v-else-if="field.type === 'readonly'" class="form-readonly">
                {{
                  field.formatter
                    ? field.formatter(boundModel[field.prop], boundModel)
                    : boundModel[field.prop] == null
                      ? '-'
                      : boundModel[field.prop]
                }}
              </div>
              <slot
                v-else
                :name="field.slotName || 'form-' + field.prop"
                :value="boundModel[field.prop]"
                :model="boundModel"
                :field="field"
              />
              <div v-if="field.tip && field.tipInline" class="form-field-tip">{{ field.tip }}</div>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import type { FormField, FormProps } from './types';

export default Vue.extend({
  name: 'CrudForm',
  model: {
    prop: 'modelValue',
    event: 'input',
  },
  props: {
    /** Vue 2.7 v-model；与 value 二选一 */
    modelValue: { type: Object as PropType<Record<string, any>>, default: undefined },
    /** 兼容 :value 绑定（未传 modelValue 时生效） */
    value: { type: Object as PropType<Record<string, any>>, default: undefined },
    sections: { type: Array as () => FormProps['sections'], default: () => [] },
    labelWidth: { type: String, default: '100px' },
    labelPosition: { type: String, default: 'left' },
    size: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    box: { type: Boolean, default: false },
    className: { type: String, default: '' },
  },
  data() {
    return {
      collapsedMap: {} as Record<number, boolean>,
      fieldErrors: {} as Record<string, string>,
    };
  },
  computed: {
    boundModel(): Record<string, any> {
      if (this.modelValue != null) return this.modelValue;
      if (this.value != null) return this.value;
      return {};
    },
    visibleSections(): FormProps['sections'] {
      return this.sections.filter((section) =>
        typeof section.hidden === 'function' ? !section.hidden(this.boundModel) : !section.hidden
      );
    },
  },
  mounted() {
    this.sections.forEach((section, index) => {
      if (section.collapsible) this.$set(this.collapsedMap, index, !!section.defaultCollapsed);
    });
  },
  methods: {
    isCollapsed(index: number) {
      return !!this.collapsedMap[index];
    },
    toggleSection(index: number) {
      this.$set(this.collapsedMap, index, !this.collapsedMap[index]);
    },
    hasStep(section: FormProps['sections'][number]) {
      return section.step !== undefined && section.step !== null && section.step !== '';
    },
    isFieldVisible(field: FormField) {
      return typeof field.hidden === 'function' ? !field.hidden(this.boundModel) : !field.hidden;
    },
    /** 仅按 section.cols / field.colSpan 算栅格，桌面端固定 24 栅格 */
    fieldColSpan(section: { cols?: number }, field: { colSpan?: number }) {
      return Math.min(24, Math.floor((24 / (section.cols || 1)) * (field.colSpan || 1)));
    },
    fieldStyle(field: FormField) {
      return { width: field.width || '100%' };
    },
    onFieldChange(field: FormField, value: any) {
      const model = { ...this.boundModel, [field.prop]: value };
      this.$emit('input', model);
      this.$emit('update:modelValue', model);
      if (field.onChange) field.onChange(value, model);
    },
    /** 兜底校验：项目里实际交给 el-form 的 validate() 亦可，这里不依赖 ref */
    validate(): Promise<boolean> {
      const values = this.boundModel as Record<string, any>;
      this.fieldErrors = {};
      let valid = true;
      this.sections.forEach((section) => {
        if (section.hidden || !section.fields) return;
        section.fields.forEach((field) => {
          if (!this.isFieldVisible(field) || !field.rules) return;
          const rules = Array.isArray(field.rules) ? field.rules : [field.rules];
          const value = values[field.prop];
          const rule =
            rules.find((item) => item.required && (value == null || value === '')) ||
            rules.find((item) => item.min != null && String(value || '').length < item.min!) ||
            rules.find((item) => item.max != null && String(value || '').length > item.max!);
          if (rule) {
            this.$set(
              this.fieldErrors,
              field.prop,
              rule.message || `${field.label || field.prop} 校验失败`
            );
            valid = false;
          }
        });
      });
      return Promise.resolve(valid);
    },
    getModel() {
      return { ...this.boundModel };
    },
    clearErrors() {
      this.fieldErrors = {};
    },
  },
});
</script>

<style lang="scss" scoped>
.form-root {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.form-box {
  padding: 20px 24px;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  background: #ffffff;
}
.form-section {
  margin-bottom: 16px;
}
.form-section.is-boxed {
  padding: 0;
  overflow: hidden;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: #ffffff;
}
.form-section:last-child {
  margin-bottom: 0;
}
.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #edf1f6;
}
.form-section-header--emphasis {
  margin-bottom: 0;
  padding: 11px 14px;
  border-bottom: 1px solid #e3e8f0;
  background: linear-gradient(180deg, #eaf1fd 0%, #f4f6f9 100%);
}
.form-section-header.is-clickable {
  cursor: pointer;
}
.form-section-header__main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.form-section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}
.form-section-step {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #3b6fe0;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(59, 111, 224, 0.35);
}
.form-section-header__caret {
  flex-shrink: 0;
  font-size: 12px;
  color: #7a8494;
}
.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2733;
}
.form-section-header--emphasis .form-section-title {
  font-size: 14px;
}
.form-section-desc {
  color: #7a8494;
  font-size: 12px;
}
.form-section-body {
  min-width: 0;
}
.form-section.is-boxed .form-section-body {
  padding: 14px 16px 4px;
}
.form-readonly {
  line-height: 32px;
  color: #1f2733;
}
.form-label {
  color: #566070;
}
.form-label .el-icon-question {
  margin-left: 4px;
  color: #7a8494;
}
.form-field-tip {
  margin-top: 4px;
  color: #7a8494;
  font-size: 12px;
  line-height: 1.4;
}
::v-deep .el-form-item {
  margin-bottom: 18px;
}
</style>
