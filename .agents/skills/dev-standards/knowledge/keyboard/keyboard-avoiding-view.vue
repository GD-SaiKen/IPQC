<template>
  <div
    ref="rootRef"
    class="keyboard-avoiding-view"
    :class="[
      `keyboard-avoiding-view--${behavior}`,
      `keyboard-avoiding-view--pin-${pinAlign}`,
      { 'keyboard-avoiding-view--active': active },
    ]"
  >
    <div ref="scrollRef" class="keyboard-avoiding-view__scroll">
      <div
        class="keyboard-avoiding-view__content"
        :class="{ 'keyboard-avoiding-view__content--pin': active }"
      >
        <slot :active="active" :keyboard-open="keyboardOpen" :input-focused="inputFocused" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide, ref } from 'vue'

import {
  DEFAULT_KEYBOARD_TRANSITION_EASING,
  DEFAULT_KEYBOARD_TRANSITION_MS,
  keyboardAvoidingKey,
  type KeyboardAvoidingBehavior,
  useKeyboardAvoiding,
} from '@/composables/use-keyboard-avoiding'

const props = withDefaults(
  defineProps<{
    /** 与键盘顶部的间距，对标 RN keyboardVerticalOffset */
    keyboardVerticalOffset?: number
    behavior?: KeyboardAvoidingBehavior
    pinAlign?: 'fit' | 'end'
    estimateInsetRatio?: number
    /** 为 false 时假定外层已 bind（如 Chat 与 composer 共用全局 inset） */
    bindViewport?: boolean
    /** 键盘展开/收起过渡（默认开；系统「减少动态效果」时自动关闭） */
    animate?: boolean
    transitionDurationMs?: number
    transitionEasing?: string
  }>(),
  {
    keyboardVerticalOffset: 10,
    behavior: 'padding',
    pinAlign: 'fit',
    estimateInsetRatio: 0.42,
    bindViewport: true,
    animate: true,
    transitionDurationMs: undefined,
    transitionEasing: undefined,
  },
)

const rootRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)

const { active, keyboardOpen, inputFocused, keyboardAvoidingContext } = useKeyboardAvoiding({
  root: rootRef,
  scroll: scrollRef,
  keyboardVerticalOffset: props.keyboardVerticalOffset,
  pinAlign: props.pinAlign,
  estimateInsetRatio: props.estimateInsetRatio,
  bindViewport: props.bindViewport,
  animate: props.animate,
  transitionDurationMs: props.transitionDurationMs ?? DEFAULT_KEYBOARD_TRANSITION_MS,
  transitionEasing: props.transitionEasing ?? DEFAULT_KEYBOARD_TRANSITION_EASING,
})

provide(keyboardAvoidingKey, keyboardAvoidingContext)
</script>

<style scoped>
.keyboard-avoiding-view {
  --kav-vv-height: 100%;
  --kav-visible-height: 100%;
  --kav-vv-top: 0px;
  --kav-keyboard-inset: 0px;
  --kav-offset: 10px;
  --kav-bottom-gap: 0px;
  --kav-transition-duration: 280ms;
  --kav-transition-easing: cubic-bezier(0.32, 0.72, 0, 1);
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.keyboard-avoiding-view--motion {
  transition:
    height var(--kav-transition-duration) var(--kav-transition-easing),
    max-height var(--kav-transition-duration) var(--kav-transition-easing);
}

.keyboard-avoiding-view--motion .keyboard-avoiding-view__content--pin {
  transition: padding-bottom var(--kav-transition-duration) var(--kav-transition-easing);
}

.keyboard-avoiding-view--motion.keyboard-avoiding-view--position {
  transition:
    height var(--kav-transition-duration) var(--kav-transition-easing),
    max-height var(--kav-transition-duration) var(--kav-transition-easing),
    padding-bottom var(--kav-transition-duration) var(--kav-transition-easing);
}

@media (prefers-reduced-motion: reduce) {
  .keyboard-avoiding-view--motion,
  .keyboard-avoiding-view--motion .keyboard-avoiding-view__content--pin,
  .keyboard-avoiding-view--motion.keyboard-avoiding-view--position {
    transition: none;
  }
}

.keyboard-avoiding-view--active {
  height: var(--kav-visible-height, var(--kav-vv-height, 100%));
  max-height: var(--kav-visible-height, var(--kav-vv-height, 100%));
}

.keyboard-avoiding-view--motion.keyboard-avoiding-view--active {
  height: var(--kav-visible-height);
  max-height: var(--kav-visible-height);
}

.keyboard-avoiding-view--height.keyboard-avoiding-view--active {
  max-height: var(--kav-visible-height, var(--kav-vv-height, 100%));
}

.keyboard-avoiding-view__scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.keyboard-avoiding-view--padding .keyboard-avoiding-view__scroll {
  padding-bottom: var(--safe-bottom, 0px);
}

.keyboard-avoiding-view--padding.keyboard-avoiding-view--active .keyboard-avoiding-view__content--pin {
  box-sizing: border-box;
  padding-bottom: calc(var(--kav-offset, 10px) + var(--safe-bottom, 0px));
}

.keyboard-avoiding-view--pin-end.keyboard-avoiding-view--padding.keyboard-avoiding-view--active
  .keyboard-avoiding-view__content--pin {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: flex-end;
}

.keyboard-avoiding-view--height .keyboard-avoiding-view__scroll {
  max-height: 100%;
}

.keyboard-avoiding-view--position.keyboard-avoiding-view--active {
  padding-bottom: calc(var(--kav-bottom-gap) + var(--safe-bottom, 0px));
}
</style>
