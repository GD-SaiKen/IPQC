<template>
  <!--
    表单页三段式：页头（可选）+ 可滚 body + 固定底栏。复制到 src/components/form-page/form-page.vue
    底栏是 flex 兄弟节点，不是 position: fixed —— fixed 会脱出高度链，
    滚动时遮住最后一屏内容，弹窗打开时还可能压在遮罩之上。
  -->
  <div
    class="form-page"
    v-loading="busy"
    element-loading-text="处理中…"
    :class="{ 'form-page--locked': busy }"
  >
    <div v-if="showHeader || $slots.header" class="form-page__header">
      <slot name="header">
        <div class="form-page__header-left">
          <el-button type="text" icon="el-icon-arrow-left" @click="$emit('cancel')">返回</el-button>
          <span class="form-page__title">{{ title }}</span>
        </div>
      </slot>
    </div>

    <div class="form-page__body">
      <slot />
    </div>

    <div class="form-page__footer">
      <slot name="footer-extra" />
      <div class="form-page__actions">
        <el-button size="small" :disabled="busy" @click="$emit('cancel')">{{ cancelText }}</el-button>
        <el-button
          v-if="showDraft"
          size="small"
          :loading="drafting"
          :disabled="busy"
          @click="emitDraft"
        >{{ draftText }}</el-button>
        <el-button
          v-if="showSubmit"
          size="small"
          type="primary"
          class="form-page__submit"
          :class="{ 'is-soft-disabled': submitSoftBlocked }"
          :loading="submitting"
          :disabled="nativeSubmitDisabled"
          @click="emitSubmit"
        >{{ submitText }}</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

export default Vue.extend({
  name: 'FormPage',
  props: {
    title: { type: String, default: '表单' },
    /** 顶栏已有标题时可传 false，只留内容与底栏 */
    showHeader: { type: Boolean, default: true },
    cancelText: { type: String, default: '取消' },
    draftText: { type: String, default: '存草稿' },
    submitText: { type: String, default: '提交' },
    showDraft: { type: Boolean, default: true },
    /** 「修改即保存」的表单页传 false，底栏只留取消 */
    showSubmit: { type: Boolean, default: true },
    submitDisabled: { type: Boolean, default: false },
    /**
     * 条件不满足时按钮仍可点，由页面弹出「为什么不能提交」的说明。
     * 走软灰样式而不是原生 disabled —— 原生 disabled 点不动，说明永远出不来。
     */
    submitDisabledClickable: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
    drafting: { type: Boolean, default: false },
  },
  computed: {
    busy(): boolean {
      return this.submitting || this.drafting;
    },
    submitSoftBlocked(): boolean {
      return this.submitDisabled && this.submitDisabledClickable && !this.busy;
    },
    nativeSubmitDisabled(): boolean {
      return this.busy || (this.submitDisabled && !this.submitDisabledClickable);
    },
  },
  methods: {
    emitDraft() {
      if (this.busy) return;
      this.$emit('draft');
    },
    emitSubmit() {
      if (this.busy) return;
      this.$emit('submit');
    },
  },
});
</script>

<style lang="scss" scoped>
.form-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #ffffff;

  /* loading 挂在整页容器上：挂 body 上时滚动后遮罩只盖可视区，底部露白 */
  ::v-deep .el-loading-mask {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}

/* 提交中锁住 body，避免边提交边改表单 */
.form-page--locked .form-page__body {
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.form-page__header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #edf1f6;
  background: #ffffff;
}

.form-page__header-left {
  display: flex;
  align-items: center;
  min-width: 0;

  > * + * {
    margin-left: 10px;
  }
}

.form-page__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2733;
}

/* 唯一可滚的区域 */
.form-page__body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 24px;
  color: #1f2733;
}

.form-page__footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-top: 1px solid #edf1f6;
  background: #ffffff;
}

.form-page__actions {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;

  ::v-deep .el-button + .el-button {
    margin-left: 10px;
  }
}

.form-page__submit.is-soft-disabled {
  opacity: 0.55;
  cursor: pointer;
}
</style>
