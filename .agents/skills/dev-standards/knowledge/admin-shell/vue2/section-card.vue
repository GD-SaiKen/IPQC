<template>
  <!--
    内容分块卡片：详情页 / 表单页里唯一的内容单元。复制到 src/components/section-card/section-card.vue
    两种标题形态：传 badge 走步骤胶囊，不传走文字标题。混用会让同一页的视觉层级变乱。
    折叠用 .sync：<SectionCard title="成员" collapsible :collapsed.sync="x">
  -->
  <section class="section-card" :class="{ 'is-collapsed': collapsedNow }">
    <header
      class="section-card__hd"
      :class="{ 'is-toggleable': collapsible }"
      :role="collapsible ? 'button' : undefined"
      :tabindex="collapsible ? 0 : undefined"
      :aria-expanded="collapsible ? (collapsedNow ? 'false' : 'true') : undefined"
      @click="toggleCollapsed"
      @keydown.enter.prevent="toggleCollapsed"
      @keydown.space.prevent="toggleCollapsed"
    >
      <span v-if="badge" class="section-card__chip">
        <span class="section-card__badge">{{ badge }}</span>
        <span class="section-card__chip-title">{{ title }}</span>
        <el-tooltip v-if="tooltip" :content="tooltip" placement="top" :open-delay="200">
          <span class="section-card__hint section-card__hint--corner" @click.stop />
        </el-tooltip>
      </span>

      <span v-else class="section-card__title-line">
        <span class="section-card__title">{{ title }}</span>
        <el-tooltip v-if="tooltip" :content="tooltip" placement="top" :open-delay="200">
          <sup class="section-card__hint" @click.stop />
        </el-tooltip>
        <span v-if="$slots['title-extra']" class="section-card__title-extra">
          <slot name="title-extra" />
        </span>
      </span>

      <slot name="aside">
        <span v-if="subtitle" class="section-card__sub">{{ subtitle }}</span>
      </slot>

      <i
        v-if="collapsible"
        class="section-card__caret el-icon-arrow-right"
        :class="{ 'is-open': !collapsedNow }"
      />
    </header>

    <!-- v-show 而非 v-if：折叠不该丢掉子组件里的填写 / 上传中间态 -->
    <div v-show="!collapsedNow" class="section-card__body">
      <slot />
    </div>
  </section>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'SectionCard',
  props: {
    /** 步骤序号；传则渲染主色胶囊标题 */
    badge: { type: String, default: '' },
    title: { type: String, required: true },
    /** 标题行右侧辅助文字（条数、只读提示等） */
    subtitle: { type: String, default: '' },
    /** 标题说明角标（悬浮出 tooltip） */
    tooltip: { type: String, default: '' },
    collapsible: { type: Boolean, default: false },
    /** 配 @update:collapsed 即 :collapsed.sync */
    collapsed: { type: Boolean, default: false },
  },
  computed: {
    /** 只有 collapsible 时才真的收起；非折叠区块忽略 collapsed，避免被误判 */
    collapsedNow(): boolean {
      return this.collapsible && this.collapsed;
    },
  },
  methods: {
    toggleCollapsed() {
      if (!this.collapsible) return;
      this.$emit('update:collapsed', !this.collapsed);
    },
  },
});
</script>

<style lang="scss" scoped>
.section-card {
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: #ffffff;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-card__hd {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1f6;

  > * + * {
    margin-left: 10px;
  }

  &.is-toggleable {
    cursor: pointer;
    user-select: none;

    &:hover .section-card__caret {
      color: #3b6fe0;
    }

    &:focus-visible {
      outline: 2px solid #3b6fe0;
      outline-offset: 2px;
    }
  }
}

/* ---- 步骤胶囊标题 ---- */
.section-card__chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  padding: 3px 12px 3px 6px;
  border-radius: 999px;
  background: #3b6fe0;
  color: #fff;

  .section-card__badge {
    flex: none;
    width: 18px;
    height: 18px;
    margin-right: 6px;
    line-height: 18px;
    border-radius: 50%;
    background: #fff;
    color: #3b6fe0;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  }
}

.section-card__chip-title {
  font-size: 15px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ---- 文字标题 ---- */
.section-card__title-line {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;

  > * + * {
    margin-left: 4px;
  }
}

.section-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2733;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.section-card__title-extra {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  vertical-align: middle;
}

.section-card__sub {
  flex: none;
  margin-left: auto;
  font-size: 12px;
  color: #7a8494;
}

/* ---- 说明角标 ---- */
.section-card__hint {
  flex: none;
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b9c2cf;
  cursor: help;
  vertical-align: super;

  &--corner {
    position: absolute;
    top: 4px;
    right: 5px;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.75);
  }
}

/* 折叠箭头：默认被推到最后；前面已有 subtitle 时紧随其后 */
.section-card__caret {
  flex: none;
  margin-left: auto;
  color: #7a8494;
  font-size: 12px;
  transition: transform 0.2s ease;

  &.is-open {
    transform: rotate(90deg);
  }
}

.section-card__sub ~ .section-card__caret {
  margin-left: 0;
}

/* 收起后标题行是唯一内容：去掉分隔线与下间距，卡片退化成一行 */
.section-card.is-collapsed .section-card__hd {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
</style>
