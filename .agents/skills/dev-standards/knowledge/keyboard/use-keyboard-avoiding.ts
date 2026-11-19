import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  type InjectionKey,
  type Ref,
} from 'vue'

import {
  bindKeyboardViewportListeners,
  isLayoutViewportResizedForKeyboard,
  readKeyboardViewport,
  resolveKeyboardOverlap,
  scheduleKeyboardViewportSync,
  unbindKeyboardViewportListeners,
  viewportHeight,
  keyboardInset,
  keyboardOpen,
} from '@/composables/use-keyboard-viewport'

export type KeyboardAvoidingBehavior = 'padding' | 'height' | 'position'

export type KeyboardAvoidingContext = {
  setAnchor: (el: HTMLElement | null) => void
  keyboardVerticalOffset: number
}

export const keyboardAvoidingKey: InjectionKey<KeyboardAvoidingContext> = Symbol('keyboardAvoiding')

export type KeyboardPinAlign = 'fit' | 'end'

export type UseKeyboardAvoidingOptions = {
  root: Ref<HTMLElement | null>
  scroll?: Ref<HTMLElement | null>
  anchor?: Ref<HTMLElement | null>
  keyboardVerticalOffset?: number
  /**
   * fit：尽量让锚点整块落在键盘上方可视区内（可滚动查看全部）
   * end：锚点贴可视区底（内容过高时只露出底部，如底栏输入）
   */
  pinAlign?: KeyboardPinAlign
  /** visualViewport 无缩高时，输入聚焦时的键盘高度预估（相对 innerHeight） */
  estimateInsetRatio?: number
  /** 是否注册全局 visualViewport 监听（页面级容器一般为 true） */
  bindViewport?: boolean
  /** 键盘收起/展开时平滑过渡（默认开启，尊重 prefers-reduced-motion） */
  animate?: boolean
  transitionDurationMs?: number
  transitionEasing?: string
}

const DEFAULT_ESTIMATE_RATIO = 0.42
export const DEFAULT_KEYBOARD_TRANSITION_MS = 280
export const DEFAULT_KEYBOARD_TRANSITION_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useKeyboardAvoiding(options: UseKeyboardAvoidingOptions) {
  const {
    root,
    scroll: scrollOverride,
    anchor: anchorOverride,
    keyboardVerticalOffset = 10,
    pinAlign = 'fit',
    estimateInsetRatio = DEFAULT_ESTIMATE_RATIO,
    bindViewport = true,
    animate = true,
    transitionDurationMs = DEFAULT_KEYBOARD_TRANSITION_MS,
    transitionEasing = DEFAULT_KEYBOARD_TRANSITION_EASING,
  } = options

  const motionEnabled = animate && !prefersReducedMotion()
  const inputFocused = ref(false)
  const anchorRef = ref<HTMLElement | null>(null)
  let motionEndTimer: ReturnType<typeof setTimeout> | null = null
  let motionPinRaf = 0
  let suppressPinDuringMotion = false

  function resolveAnchor() {
    return anchorOverride?.value ?? anchorRef.value
  }

  function resolveScroll() {
    return scrollOverride?.value ?? root.value
  }

  const effectiveInset = computed(() => {
    const metrics = readKeyboardViewport()
    if (isLayoutViewportResizedForKeyboard(metrics)) return 0
    const measured = resolveKeyboardOverlap(inputFocused.value)
    if (measured >= 48) return measured
    if (keyboardInset.value >= 48) return keyboardInset.value
    const layoutHeight = window.innerHeight
    const shrink = Math.max(0, Math.round(layoutHeight - viewportHeight.value))
    if (shrink >= 48 && inputFocused.value) return shrink
    if (!inputFocused.value) return 0
    if (!keyboardOpen.value) return 0
    return Math.round(layoutHeight * estimateInsetRatio)
  })

  const bottomGap = computed(() => effectiveInset.value + keyboardVerticalOffset)

  function resolveVisibleViewport() {
    const { top, height, shrink, shrinkFromStable } = readKeyboardViewport()
    const visualHeight = height || viewportHeight.value
    const active = keyboardOpen.value || inputFocused.value

    if (!active) {
      return { top, height: visualHeight, bottom: top + visualHeight }
    }

    const browserAlreadyResized = shrink >= 48
      || shrinkFromStable >= 48
      || keyboardInset.value >= 48

    if (browserAlreadyResized) {
      return { top, height: visualHeight, bottom: top + visualHeight }
    }

    const effective = effectiveInset.value
    const visibleHeight = Math.max(0, window.innerHeight - effective - top)
    return { top, height: visibleHeight, bottom: top + visibleHeight }
  }

  function applyCssVars() {
    const el = root.value
    if (!el) return
    const { top, height, bottom } = resolveVisibleViewport()
    const isActive = keyboardOpen.value || inputFocused.value
    const layoutHeight = window.innerHeight
    const visiblePx = Math.round(isActive ? height : layoutHeight)

    el.style.setProperty('--kav-vv-top', `${top}px`)
    el.style.setProperty('--kav-vv-height', `${height}px`)
    el.style.setProperty('--kav-visible-height', `${visiblePx}px`)
    el.style.setProperty('--kav-keyboard-inset', `${effectiveInset.value}px`)
    el.style.setProperty('--kav-offset', `${keyboardVerticalOffset}px`)
    el.style.setProperty('--kav-bottom-gap', `${bottomGap.value}px`)
    el.style.setProperty('--kav-visible-bottom', `${bottom}px`)
    el.style.setProperty('--kav-transition-duration', `${transitionDurationMs}ms`)
    el.style.setProperty('--kav-transition-easing', transitionEasing)
    el.classList.toggle('keyboard-avoiding-view--motion', motionEnabled)

    if (motionEnabled) {
      el.style.height = `${visiblePx}px`
      el.style.maxHeight = `${visiblePx}px`
    } else {
      el.style.removeProperty('height')
      el.style.removeProperty('max-height')
    }
  }

  function finishMotionPin() {
    suppressPinDuringMotion = false
    applyCssVars()
    pinAnchorToKeyboard()
  }

  function beginMotion() {
    if (!motionEnabled) {
      pinAnchorToKeyboard()
      return
    }
    suppressPinDuringMotion = true
    if (motionEndTimer) clearTimeout(motionEndTimer)
    motionEndTimer = setTimeout(finishMotionPin, transitionDurationMs + 40)
  }

  function pinAnchorToKeyboard() {
    if (!keyboardOpen.value && !inputFocused.value) return

    const scroll = resolveScroll()
    const anchor = resolveAnchor()
    if (!scroll || !anchor) return

    const pad = keyboardVerticalOffset
    const { top, bottom: visibleBottom } = resolveVisibleViewport()
    const targetTop = top + pad
    const targetBottom = visibleBottom - pad
    const blockRect = anchor.getBoundingClientRect()
    const available = targetBottom - targetTop

    let delta = 0

    if (pinAlign === 'end') {
      delta = blockRect.bottom - targetBottom
    } else if (blockRect.height <= available) {
      delta = blockRect.bottom - targetBottom
      const topAfter = blockRect.top + delta
      if (topAfter < targetTop) {
        delta += targetTop - topAfter
      }
    } else if (blockRect.bottom > targetBottom) {
      delta = blockRect.bottom - targetBottom
    }

    if (Math.abs(delta) > 2) {
      scroll.scrollTop += delta
    }

    const focused = document.activeElement
    if (focused instanceof HTMLElement && anchor.contains(focused)) {
      const field = focused.closest('.van-cell') ?? focused
      const fieldRect = field.getBoundingClientRect()
      if (fieldRect.top < targetTop) {
        scroll.scrollTop -= targetTop - fieldRect.top
      }
      if (fieldRect.bottom > targetBottom) {
        scroll.scrollTop += fieldRect.bottom - targetBottom
      }
    }
  }

  function scheduleEnsureVisible() {
    beginMotion()
    scheduleKeyboardViewportSync()
    applyCssVars()
    window.requestAnimationFrame(() => {
      scheduleKeyboardViewportSync()
      applyCssVars()
    })
  }

  function onFocusIn(event: FocusEvent) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!target.closest('input, textarea, select')) return
    inputFocused.value = true
    scheduleEnsureVisible()
  }

  function onFocusOut(event: FocusEvent) {
    const next = event.relatedTarget
    const host = root.value
    if (next instanceof HTMLElement && host?.contains(next)) return
    window.setTimeout(() => {
      const active = document.activeElement
      if (active instanceof HTMLElement && host?.contains(active)) return
      inputFocused.value = false
      beginMotion()
      applyCssVars()
    }, 80)
  }

  function onViewportChange() {
    applyCssVars()
    if (suppressPinDuringMotion) return
    if (!inputFocused.value && !keyboardOpen.value) return
    if (motionPinRaf) cancelAnimationFrame(motionPinRaf)
    motionPinRaf = requestAnimationFrame(() => {
      motionPinRaf = 0
      pinAnchorToKeyboard()
    })
  }

  let boundHost: HTMLElement | null = null

  function setAnchor(el: HTMLElement | null) {
    anchorRef.value = el
    if (inputFocused.value) scheduleEnsureVisible()
  }

  onMounted(() => {
    if (bindViewport) bindKeyboardViewportListeners()
    void nextTick(() => {
      boundHost = root.value
      if (!boundHost) return
      boundHost.addEventListener('focusin', onFocusIn)
      boundHost.addEventListener('focusout', onFocusOut)
      window.visualViewport?.addEventListener('resize', onViewportChange)
      window.visualViewport?.addEventListener('scroll', onViewportChange)
      applyCssVars()
    })
  })

  onUnmounted(() => {
    if (motionEndTimer) clearTimeout(motionEndTimer)
    if (motionPinRaf) cancelAnimationFrame(motionPinRaf)
    if (boundHost) {
      boundHost.removeEventListener('focusin', onFocusIn)
      boundHost.removeEventListener('focusout', onFocusOut)
      boundHost = null
    }
    window.visualViewport?.removeEventListener('resize', onViewportChange)
    window.visualViewport?.removeEventListener('scroll', onViewportChange)
    if (bindViewport) unbindKeyboardViewportListeners()
  })

  const active = computed(() => keyboardOpen.value || inputFocused.value)

  return {
    keyboardOpen,
    inputFocused,
    active,
    bottomGap,
    effectiveInset,
    setAnchor,
    scheduleEnsureVisible,
    keyboardAvoidingContext: {
      setAnchor,
      keyboardVerticalOffset,
    } satisfies KeyboardAvoidingContext,
  }
}
